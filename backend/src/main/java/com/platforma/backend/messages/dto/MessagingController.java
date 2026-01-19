package com.platforma.backend.messages;

import com.platforma.backend.messages.dto.ConversationListItemDto;
import com.platforma.backend.messages.dto.MessageDto;
import com.platforma.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;

    @PostMapping("/conversations/direct/{otherUserId}")
    public Map<String, Object> direct(
            @AuthenticationPrincipal User me,
            @PathVariable Long otherUserId
    ) {
        var c = messagingService.getOrCreateDirect(me.getId(), otherUserId);
        return Map.of("conversationId", c.getId());
    }

    @GetMapping("/conversations")
    public List<ConversationListItemDto> list(@AuthenticationPrincipal User me) {
        return messagingService.listConversations(me.getId());
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<MessageDto> latest(
            @AuthenticationPrincipal User me,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "30") int limit
    ) {
        return messagingService.getLatestMessages(me.getId(), conversationId, limit);
    }

    @PostMapping(
            value = "/conversations/{conversationId}/messages",
            consumes = "multipart/form-data"
    )
    public MessageDto sendMultipart(
            @AuthenticationPrincipal User me,
            @PathVariable Long conversationId,
            @RequestPart(name = "content", required = false) String content,
            @RequestPart(name = "file", required = false) MultipartFile file
    ) {
        return messagingService.sendMultipart(me.getId(), conversationId, content, file);
    }

    @DeleteMapping("/conversations/{conversationId}")
    public void deleteForMe(
            @AuthenticationPrincipal User me,
            @PathVariable Long conversationId
    ) {
        messagingService.deleteForMe(me.getId(), conversationId);
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<byte[]> download(
            @AuthenticationPrincipal User me,
            @PathVariable Long attachmentId
    ) {
        return messagingService.downloadAttachment(me.getId(), attachmentId);
    }








}
