package com.generalstore.backend.controller;

import com.generalstore.backend.model.Order;
import com.generalstore.backend.model.Product;
import com.generalstore.backend.repository.OrderRepository;
import com.generalstore.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    // Summary stats: total orders, total revenue, avg order value, low stock count
    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        List<Order> orders = orderRepository.findAll();
        List<Product> products = productRepository.findAll();

        double totalRevenue = orders.stream()
                .filter(o -> o.getTotalAmount() != null)
                .mapToDouble(Order::getTotalAmount)
                .sum();

        long paidOrders = orders.stream()
                .filter(o -> "Paid".equalsIgnoreCase(o.getPaymentStatus()))
                .count();

        long unpaidOrders = orders.size() - paidOrders;

        long lowStockCount = products.stream()
                .filter(p -> p.getStockQuantity() < 10)
                .count();

        double avgOrderValue = orders.isEmpty() ? 0 : totalRevenue / orders.size();

        long deliveredOrders = orders.stream()
                .filter(o -> "Delivered".equalsIgnoreCase(o.getStatus()))
                .count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalOrders", orders.size());
        summary.put("totalRevenue", totalRevenue);
        summary.put("avgOrderValue", Math.round(avgOrderValue * 100.0) / 100.0);
        summary.put("lowStockCount", lowStockCount);
        summary.put("paidOrders", paidOrders);
        summary.put("unpaidOrders", unpaidOrders);
        summary.put("deliveredOrders", deliveredOrders);
        summary.put("totalProducts", products.size());

        return summary;
    }

    // Top 5 most ordered products (parsed from order items strings)
    @GetMapping("/top-products")
    public List<Map<String, Object>> getTopProducts() {
        List<Order> orders = orderRepository.findAll();
        Map<String, Integer> productCounts = new HashMap<>();

        for (Order order : orders) {
            if (order.getItems() != null) {
                String[] items = order.getItems().split(",");
                for (String item : items) {
                    item = item.trim();
                    // Items are stored as "2x Product Name" format
                    String[] parts = item.split("x ", 2);
                    if (parts.length == 2) {
                        int qty = 1;
                        try { qty = Integer.parseInt(parts[0].trim()); } catch (Exception e) {}
                        String productName = parts[1].trim();
                        productCounts.merge(productName, qty, Integer::sum);
                    }
                }
            }
        }

        return productCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", entry.getKey());
                    item.put("totalSold", entry.getValue());
                    return item;
                })
                .collect(Collectors.toList());
    }

    // Recent orders (last 10)
    @GetMapping("/recent-orders")
    public List<Order> getRecentOrders() {
        List<Order> orders = orderRepository.findAll();
        Collections.reverse(orders);
        return orders.stream().limit(10).collect(Collectors.toList());
    }

    // Revenue trend - daily revenue for last 30 days (based on orderDate strings)
    @GetMapping("/revenue-trend")
    public List<Map<String, Object>> getRevenueTrend() {
        List<Order> orders = orderRepository.findAll();
        Map<String, Double> dailyRevenue = new LinkedHashMap<>();

        for (Order order : orders) {
            if (order.getOrderDate() != null && order.getTotalAmount() != null) {
                // Extract date part (first 10 chars or before comma)
                String dateStr = order.getOrderDate();
                if (dateStr.contains(",")) {
                    dateStr = dateStr.split(",")[0].trim();
                } else if (dateStr.length() > 10) {
                    dateStr = dateStr.substring(0, 10);
                }
                dailyRevenue.merge(dateStr, order.getTotalAmount(), Double::sum);
            }
        }

        return dailyRevenue.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("date", entry.getKey());
                    item.put("revenue", entry.getValue());
                    return item;
                })
                .collect(Collectors.toList());
    }

    // Category-wise sales breakdown
    @GetMapping("/category-sales")
    public List<Map<String, Object>> getCategorySales() {
        List<Order> orders = orderRepository.findAll();
        List<Product> products = productRepository.findAll();

        // Create a product name -> category map
        Map<String, String> productCategoryMap = new HashMap<>();
        for (Product p : products) {
            if (p.getCategory() != null) {
                productCategoryMap.put(p.getName().toLowerCase(), p.getCategory());
            }
        }

        // Parse orders and tally by category
        Map<String, Double> categorySales = new HashMap<>();
        for (Order order : orders) {
            if (order.getItems() != null && order.getTotalAmount() != null) {
                String[] items = order.getItems().split(",");
                int totalItemsInOrder = items.length;
                double perItemShare = order.getTotalAmount() / Math.max(totalItemsInOrder, 1);

                for (String item : items) {
                    item = item.trim();
                    String[] parts = item.split("x ", 2);
                    if (parts.length == 2) {
                        String productName = parts[1].trim().toLowerCase();
                        String category = productCategoryMap.getOrDefault(productName, "Uncategorized");
                        int qty = 1;
                        try { qty = Integer.parseInt(parts[0].trim()); } catch (Exception e) {}
                        categorySales.merge(category, perItemShare * qty, Double::sum);
                    }
                }
            }
        }

        return categorySales.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .map(entry -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("category", entry.getKey());
                    item.put("sales", Math.round(entry.getValue()));
                    return item;
                })
                .collect(Collectors.toList());
    }

    // Product recommendations — "Frequently Bought Together" based on order co-occurrence
    @GetMapping("/recommendations/{productId}")
    public List<Map<String, Object>> getRecommendations(@PathVariable Long productId) {
        List<Order> orders = orderRepository.findAll();
        List<Product> products = productRepository.findAll();

        // Find the product name
        Product targetProduct = products.stream()
                .filter(p -> p.getId().equals(productId))
                .findFirst()
                .orElse(null);

        if (targetProduct == null) return Collections.emptyList();

        String targetName = targetProduct.getName().toLowerCase();

        // Find all orders containing this product
        Map<String, Integer> coOccurrence = new HashMap<>();
        for (Order order : orders) {
            if (order.getItems() != null) {
                String itemsLower = order.getItems().toLowerCase();
                if (itemsLower.contains(targetName)) {
                    // Parse all items in this order
                    String[] items = order.getItems().split(",");
                    for (String item : items) {
                        String[] parts = item.trim().split("x ", 2);
                        if (parts.length == 2) {
                            String pName = parts[1].trim();
                            if (!pName.equalsIgnoreCase(targetProduct.getName())) {
                                coOccurrence.merge(pName, 1, Integer::sum);
                            }
                        }
                    }
                }
            }
        }

        // Map back product names to product objects
        Map<String, Product> productMap = new HashMap<>();
        for (Product p : products) {
            productMap.put(p.getName().toLowerCase(), p);
        }

        return coOccurrence.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(4)
                .map(entry -> {
                    Map<String, Object> rec = new HashMap<>();
                    Product p = productMap.get(entry.getKey().toLowerCase());
                    if (p != null) {
                        rec.put("id", p.getId());
                        rec.put("name", p.getName());
                        rec.put("price", p.getPrice());
                        rec.put("imageUrl", p.getImageUrl());
                        rec.put("category", p.getCategory());
                        rec.put("stockQuantity", p.getStockQuantity());
                        rec.put("coCount", entry.getValue());
                    } else {
                        rec.put("name", entry.getKey());
                        rec.put("coCount", entry.getValue());
                    }
                    return rec;
                })
                .filter(rec -> rec.containsKey("id"))
                .collect(Collectors.toList());
    }

    // Order status distribution
    @GetMapping("/status-distribution")
    public Map<String, Long> getStatusDistribution() {
        List<Order> orders = orderRepository.findAll();
        return orders.stream()
                .filter(o -> o.getStatus() != null)
                .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));
    }
}
