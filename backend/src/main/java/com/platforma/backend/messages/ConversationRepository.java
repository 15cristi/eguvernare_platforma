package com.platforma.backend.messages;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("""
        select c from Conversation c
        where c.id in (
            select cp1.conversation.id from ConversationParticipant cp1
            where cp1.user.id = :userA
        )
        and c.id in (
            select cp2.conversation.id from ConversationParticipant cp2
            where cp2.user.id = :userB
        )
    """)
    Optional<Conversation> findDirectBetween(Long userA, Long userB);
}
