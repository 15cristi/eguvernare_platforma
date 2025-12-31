package com.platforma.backend.lookup;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "lookup_values",
        uniqueConstraints = @UniqueConstraint(columnNames = {"category", "value"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LookupValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private LookupCategory category;

    @Column(nullable = false, length = 200)
    private String value;
}
