package com.generalstore.backend.controller;

import com.generalstore.backend.model.Coupon;
import com.generalstore.backend.repository.CouponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponRepository couponRepository;

    // Get all coupons (admin)
    @GetMapping
    public List<Coupon> getAllCoupons() {
        return couponRepository.findAll();
    }

    // Create a new coupon (admin)
    @PostMapping
    public Coupon createCoupon(@RequestBody Coupon coupon) {
        if (coupon.getUsedCount() == null) coupon.setUsedCount(0);
        if (coupon.getIsActive() == null) coupon.setIsActive(true);
        coupon.setCode(coupon.getCode().toUpperCase());
        return couponRepository.save(coupon);
    }

    // Update a coupon (admin)
    @PutMapping("/{id}")
    public ResponseEntity<Coupon> updateCoupon(@PathVariable Long id, @RequestBody Coupon couponDetails) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Coupon not found with id: " + id));

        coupon.setCode(couponDetails.getCode().toUpperCase());
        coupon.setDiscountType(couponDetails.getDiscountType());
        coupon.setDiscountValue(couponDetails.getDiscountValue());
        coupon.setMinOrderValue(couponDetails.getMinOrderValue());
        coupon.setMaxDiscount(couponDetails.getMaxDiscount());
        coupon.setExpiryDate(couponDetails.getExpiryDate());
        coupon.setUsageLimit(couponDetails.getUsageLimit());
        coupon.setIsActive(couponDetails.getIsActive());
        coupon.setDescription(couponDetails.getDescription());

        return ResponseEntity.ok(couponRepository.save(coupon));
    }

    // Delete a coupon (admin)
    @DeleteMapping("/{id}")
    public void deleteCoupon(@PathVariable Long id) {
        couponRepository.deleteById(id);
    }

    // Validate and apply a coupon (customer-facing)
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateCoupon(@RequestBody Map<String, Object> request) {
        String code = ((String) request.get("code")).toUpperCase();
        Double orderTotal = Double.parseDouble(request.get("orderTotal").toString());

        Map<String, Object> result = new HashMap<>();

        Optional<Coupon> optCoupon = couponRepository.findByCode(code);
        if (optCoupon.isEmpty()) {
            result.put("valid", false);
            result.put("message", "Invalid coupon code");
            return ResponseEntity.ok(result);
        }

        Coupon coupon = optCoupon.get();

        // Check if active
        if (!coupon.getIsActive()) {
            result.put("valid", false);
            result.put("message", "This coupon is no longer active");
            return ResponseEntity.ok(result);
        }

        // Check usage limit
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            result.put("valid", false);
            result.put("message", "Coupon usage limit reached");
            return ResponseEntity.ok(result);
        }

        // Check minimum order value
        if (coupon.getMinOrderValue() != null && orderTotal < coupon.getMinOrderValue()) {
            result.put("valid", false);
            result.put("message", "Minimum order value is ₹" + coupon.getMinOrderValue().intValue());
            return ResponseEntity.ok(result);
        }

        // Calculate discount
        double discount = 0;
        if ("PERCENTAGE".equalsIgnoreCase(coupon.getDiscountType())) {
            discount = orderTotal * (coupon.getDiscountValue() / 100.0);
            if (coupon.getMaxDiscount() != null && discount > coupon.getMaxDiscount()) {
                discount = coupon.getMaxDiscount();
            }
        } else {
            discount = coupon.getDiscountValue();
        }
        discount = Math.min(discount, orderTotal);

        // Increment usage
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        couponRepository.save(coupon);

        result.put("valid", true);
        result.put("discount", Math.round(discount));
        result.put("message", "Coupon applied! You save ₹" + Math.round(discount));
        result.put("description", coupon.getDescription());
        return ResponseEntity.ok(result);
    }
}
