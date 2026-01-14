package com.platforma.backend.publication;
import java.time.LocalDate;

import com.platforma.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "publications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PublicationType type;

    @Column(nullable = false, length = 220)
    private String title;

    @Column(length = 180)
    private String venue;

    private Integer year;

    @Column(length = 500)
    private String url;

    @Column(columnDefinition = "text")
    private String authors;

    @Column(name = "external_link")
    private String externalLink;

    @Column(name = "published_date")
    private LocalDate publishedDate;

    @Column(columnDefinition = "text")
    private String keywords;

    @Column(name = "pdf_path")
    private String pdfPath;


    @Column(name = "journal_title")
    private String journalTitle;

    @Column(name = "volume_issue")
    private String volumeIssue;

    @Column
    private String pages;

    @Column
    private String doi;

    @Column
    private String publisher;
}
