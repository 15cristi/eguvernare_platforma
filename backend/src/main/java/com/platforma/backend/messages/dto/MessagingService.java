package com.platforma.backend.messages;

import com.platforma.backend.messages.dto.ConversationListItemDto;
import com.platforma.backend.messages.dto.MessageDto;
import com.platforma.backend.profile.ProfileRepository;
import com.platforma.backend.user.User;
import com.platforma.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final MessageAttachmentRepository attachmentRepository;

    private final SimpMessagingTemplate messaging; // ✅ ADD

    @Transactional
    public Conversation getOrCreateDirect(Long meId, Long otherUserId) {
        if (meId.equals(otherUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can’t send a message to yourself.");
        }

        var existing = conversationRepository.findDirectBetween(meId, otherUserId);
        if (existing.isPresent()) {
            participantRepository.findByConversationIdAndUserId(existing.get().getId(), meId)
                    .ifPresent(cp -> {
                        if (cp.getDeletedAt() != null) {
                            cp.setDeletedAt(null);
                            participantRepository.save(cp);
                        }
                    });
            return existing.get();
        }

        Conversation c = conversationRepository.save(Conversation.builder().build());

        User me = userRepository.findById(meId).orElseThrow();
        User other = userRepository.findById(otherUserId).orElseThrow();

        participantRepository.save(ConversationParticipant.builder()
                .conversation(c).user(me).deletedAt(null).build());

        participantRepository.save(ConversationParticipant.builder()
                .conversation(c).user(other).deletedAt(null).build());

        return c;
    }

    @Transactional(readOnly = true)
    public List<ConversationListItemDto> listConversations(Long meId) {
        return participantRepository.listVisibleForUser(meId).stream().map(cp -> {
            var cId = cp.getConversation().getId();

            var otherCp = participantRepository.findOtherParticipant(cId, meId)
                    .orElseThrow(() -> new RuntimeException("Invalid conversation"));

            var other = otherCp.getUser();
            var otherProfile = profileRepository.findById(other.getId()).orElse(null);

            var lastMsg = messageRepository.latest(cId, PageRequest.of(0, 1)).stream().findFirst().orElse(null);
            String preview = lastMsg == null || lastMsg.getContent() == null ? "" : lastMsg.getContent();

            return new ConversationListItemDto(
                    cId,
                    other.getId(),
                    other.getFirstName() + " " + other.getLastName(),
                    other.getRole().name(),
                    otherProfile == null ? null : otherProfile.getAvatarUrl(),
                    preview
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getLatestMessages(Long meId, Long conversationId, int limit) {
        ensureMember(meId, conversationId);

        int safeLimit = Math.max(1, Math.min(limit, 50));

        return messageRepository.latest(conversationId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public MessageDto sendMultipart(Long meId, Long conversationId, String content, MultipartFile file) {
        ensureMember(meId, conversationId);

        String text = content == null ? "" : content.trim();
        boolean hasFile = file != null && !file.isEmpty();

        if (text.isEmpty() && !hasFile) {
            throw new RuntimeException("Empty message");
        }

        if (hasFile) {
            String ct = file.getContentType();
            boolean looksPdf = "application/pdf".equalsIgnoreCase(ct)
                    || (file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".pdf"));

            if (!looksPdf) throw new RuntimeException("Only PDF allowed");

            long max = 10L * 1024 * 1024; // 10 MB
            if (file.getSize() > max) throw new RuntimeException("File too large (max 10MB)");
        }

        var conv = conversationRepository.findById(conversationId).orElseThrow();
        var me = userRepository.findById(meId).orElseThrow();

        var msg = messageRepository.save(Message.builder()
                .conversation(conv)
                .sender(me)
                .content(text)
                .build());

        if (hasFile) {
            byte[] bytes;
            try {
                bytes = file.getBytes();
            } catch (Exception e) {
                throw new RuntimeException("Failed to read file");
            }

            String originalName = file.getOriginalFilename() == null ? "attachment.pdf" : file.getOriginalFilename();
            attachmentRepository.save(MessageAttachment.builder()
                    .message(msg)
                    .originalName(originalName)
                    .mimeType("application/pdf")
                    .sizeBytes(file.getSize())
                    .data(bytes)
                    .build());
        }

        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);

        MessageDto dto = toDto(msg);

        // ✅ BROADCAST către toți abonații conversației
        messaging.convertAndSend("/topic/conversations." + conversationId, dto);

        return dto;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadAttachment(Long meId, Long attachmentId) {
        var att = attachmentRepository.findById(attachmentId).orElseThrow();

        Long conversationId = att.getMessage().getConversation().getId();
        ensureMember(meId, conversationId);

        String fileName = att.getOriginalName() == null ? "attachment.pdf" : att.getOriginalName().replace("\"", "");

        return ResponseEntity.ok()
                .header("Content-Type", att.getMimeType() == null ? "application/pdf" : att.getMimeType())
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .body(att.getData());
    }

    @Transactional
    public void deleteForMe(Long meId, Long conversationId) {
        ensureMember(meId, conversationId);

        var cp = participantRepository.findByConversationIdAndUserId(conversationId, meId)
                .orElseThrow();

        cp.setDeletedAt(Instant.now());
        participantRepository.save(cp);
    }

    private void ensureMember(Long meId, Long conversationId) {
        participantRepository.findByConversationIdAndUserId(conversationId, meId)
                .orElseThrow(() -> new RuntimeException("Not allowed"));
    }

    private MessageDto toDto(Message m) {
        var atts = attachmentRepository.findByMessageId(m.getId()).stream()
                .map(a -> new com.platforma.backend.messages.dto.AttachmentDto(
                        a.getId(),
                        a.getOriginalName(),
                        a.getMimeType(),
                        a.getSizeBytes()
                ))
                .toList();

        return new com.platforma.backend.messages.dto.MessageDto(
                m.getId(),
                m.getSender().getId(),
                m.getContent(),
                m.getCreatedAt(),
                atts
        );
    }
}
