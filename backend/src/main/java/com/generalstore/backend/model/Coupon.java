package com.generalstore.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "coupons")
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;              // e.g., "WELCOME10", "FLAT50"

    private String discountType;      // "PERCENTAGE" or "FLAT"
    private Double discountValue;     // e.g., 10 (means 10% or ₹10)
    private Double minOrderValue;     // Minimum order value to apply coupon
    private Double maxDiscount;       // Max discount cap for percentage coupons
    private String expiryDate;        // Expiry date string
    private Integer usageLimit;       // Max number of times coupon can be used
    private Integer usedCount;        // How many times it has been used
    private Boolean isActive;         // Enable/Disable coupon

    @Column(length = 500)
    private String description;       // e.g., "Get 10% off on orders above ₹500"

    // Default Constructor
    public Coupon() {
        this.usedCount = 0;
        this.isActive = true;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public Double getDiscountValue() { return discountValue; }
    public void setDiscountValue(Double discountValue) { this.discountValue = discountValue; }

    public Double getMinOrderValue() { return minOrderValue; }
    public void setMinOrderValue(Double minOrderValue) { this.minOrderValue = minOrderValue; }

    public Double getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(Double maxDiscount) { this.maxDiscount = maxDiscount; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }

    public Integer getUsedCount() { return usedCount; }
    public void setUsedCount(Integer usedCount) { this.usedCount = usedCount; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
