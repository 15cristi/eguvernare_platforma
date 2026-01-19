package com.platforma.backend.messages;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "message_attachments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "message_id")
    private Message message;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String mimeType;

    @Column(nullable = false)
    private Long sizeBytes;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] data;
}
