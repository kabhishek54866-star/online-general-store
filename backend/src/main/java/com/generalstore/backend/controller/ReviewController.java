package com.generalstore.backend.controller;

import com.generalstore.backend.model.Review;
import com.generalstore.backend.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    // Get all reviews for a specific product
    @GetMapping("/{productId}")
    public List<Review> getReviewsByProduct(@PathVariable Long productId) {
        return reviewRepository.findByProductId(productId);
    }

    // Submit a new review
    @PostMapping
    public Review addReview(@RequestBody Review review) {
        if (review.getReviewDate() == null) {
            review.setReviewDate(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(new java.util.Date()));
        }
        return reviewRepository.save(review);
    }

    // Get average rating for a product
    @GetMapping("/average/{productId}")
    public double getAverageRating(@PathVariable Long productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) return 0;
        return reviews.stream().mapToInt(Review::getRating).average().orElse(0);
    }
}
