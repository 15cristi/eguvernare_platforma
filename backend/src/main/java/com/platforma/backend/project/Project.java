package com.platforma.backend.project;

import com.platforma.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Titlu EN*
    @Column(nullable = false, length = 180)
    private String title;

    // Acronym*
    @Column(nullable = false, length = 60)
    private String acronym;

    // Abstract EN (în poză e separat de description)
    @Column(length = 4000)
    private String abstractEn;

    // Parteneri
    @Column(length = 1200)
    private String partners;

    // Coordonator
    @Column(length = 300)
    private String coordinator;

    // Numărul de contract*
    @Column(nullable = false, length = 80)
    private String contractNumber;

    // Data demarării*
    @Column(nullable = false)
    private LocalDate startDate;

    // Data finalizării*
    @Column(nullable = false)
    private LocalDate endDate;

    // Posibilă întindere (opțional)
    private LocalDate possibleExtensionEndDate;

    // Dacă mai folosești URL undeva, îl păstrăm
    @Column(length = 500)
    private String url;
}
