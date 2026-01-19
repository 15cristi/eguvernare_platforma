package com.platforma.backend.messages;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
        select m from Message m
        where m.conversation.id = :conversationId
        order by m.id desc
    """)
    List<Message> latest(Long conversationId, Pageable pageable);
}
