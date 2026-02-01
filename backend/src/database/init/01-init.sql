-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default gift packages
INSERT INTO point_packages (id, name, description, points, "bonusPoints", "priceUsd", "isActive", "isFeatured", "sortOrder", "badgeText", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'Starter Pack', 'Perfect for trying out the platform', 100, 0, 0.99, true, false, 1, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Basic Pack', 'Great value for regular users', 500, 50, 4.99, true, false, 2, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'Popular Pack', 'Most popular choice', 1200, 200, 9.99, true, true, 3, 'BEST VALUE', NOW(), NOW()),
  (uuid_generate_v4(), 'Premium Pack', 'For dedicated supporters', 2500, 500, 19.99, true, false, 4, NULL, NOW(), NOW()),
  (uuid_generate_v4(), 'VIP Pack', 'Ultimate supporter package', 6000, 1500, 49.99, true, false, 5, 'VIP', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert default gifts
INSERT INTO gifts (id, name, description, "iconUrl", "pointCost", "creatorEarnings", tier, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 'Heart', 'Show some love', '/gifts/heart.png', 10, 7, 'basic', true, 1, NOW(), NOW()),
  (uuid_generate_v4(), 'Star', 'You are a star!', '/gifts/star.png', 25, 17, 'basic', true, 2, NOW(), NOW()),
  (uuid_generate_v4(), 'Coffee', 'Keep them energized', '/gifts/coffee.png', 50, 35, 'standard', true, 3, NOW(), NOW()),
  (uuid_generate_v4(), 'Rose', 'A beautiful gesture', '/gifts/rose.png', 100, 70, 'standard', true, 4, NOW(), NOW()),
  (uuid_generate_v4(), 'Crown', 'Royalty treatment', '/gifts/crown.png', 250, 175, 'premium', true, 5, NOW(), NOW()),
  (uuid_generate_v4(), 'Diamond', 'Precious and rare', '/gifts/diamond.png', 500, 350, 'premium', true, 6, NOW(), NOW()),
  (uuid_generate_v4(), 'Rocket', 'To the moon!', '/gifts/rocket.png', 1000, 700, 'legendary', true, 7, NOW(), NOW()),
  (uuid_generate_v4(), 'Castle', 'Build their kingdom', '/gifts/castle.png', 2500, 1750, 'legendary', true, 8, NOW(), NOW())
ON CONFLICT DO NOTHING;
