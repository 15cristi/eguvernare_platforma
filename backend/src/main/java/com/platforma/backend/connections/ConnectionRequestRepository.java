package com.platforma.backend.connections;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConnectionRequestRepository extends JpaRepository<ConnectionRequest, Long> {

    Optional<ConnectionRequest> findByRequester_IdAndAddressee_Id(Long requesterId, Long addresseeId);

    @Query("""
        select cr
        from ConnectionRequest cr
        where cr.addressee.id = :userId and cr.status = com.platforma.backend.connections.ConnectionRequest.Status.PENDING
        order by cr.createdAt desc
    """)
    List<ConnectionRequest> findIncomingPending(@Param("userId") Long userId);

    @Query("""
        select cr
        from ConnectionRequest cr
        where (cr.requester.id = :userId or cr.addressee.id = :userId)
        order by cr.createdAt desc
    """)
    List<ConnectionRequest> findAllForUser(@Param("userId") Long userId);

    @Query("""
        select cr
        from ConnectionRequest cr
        where cr.status = com.platforma.backend.connections.ConnectionRequest.Status.ACCEPTED
          and (cr.requester.id = :userId or cr.addressee.id = :userId)
        order by cr.createdAt desc
    """)
    List<ConnectionRequest> findAcceptedForUser(@Param("userId") Long userId);
}
