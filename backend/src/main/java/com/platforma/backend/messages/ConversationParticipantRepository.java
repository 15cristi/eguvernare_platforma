package com.platforma.backend.messages;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    @Query("""
        select cp from ConversationParticipant cp
        where cp.user.id = :userId and cp.deletedAt is null
        order by cp.conversation.updatedAt desc
    """)
    List<ConversationParticipant> listVisibleForUser(Long userId);

    @Query("""
        select cp from ConversationParticipant cp
        where cp.conversation.id = :conversationId and cp.user.id <> :meId
    """)
    Optional<ConversationParticipant> findOtherParticipant(Long conversationId, Long meId);
}
