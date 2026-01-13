package com.platforma.backend.publication;

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

    @Column(nullable = false, length = 220)
    private String title;

    @Column(length = 180)
    private String venue;

    private Integer year;

    @Column(length = 500)
    private String url;
}
