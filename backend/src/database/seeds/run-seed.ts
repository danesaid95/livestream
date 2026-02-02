import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';

const seedPointPackages = async (dataSource: DataSource) => {
  const packages = [
    {
      name: 'Starter Pack',
      description: 'Perfect for trying out the platform',
      points: 100,
      bonusPoints: 0,
      priceUsd: 0.99,
      isActive: true,
      isFeatured: false,
      sortOrder: 1,
      badgeText: null,
    },
    {
      name: 'Basic Pack',
      description: 'Great value for casual viewers',
      points: 500,
      bonusPoints: 25,
      priceUsd: 4.99,
      isActive: true,
      isFeatured: false,
      sortOrder: 2,
      badgeText: null,
    },
    {
      name: 'Popular Pack',
      description: 'Most popular choice',
      points: 1000,
      bonusPoints: 100,
      priceUsd: 9.99,
      isActive: true,
      isFeatured: true,
      sortOrder: 3,
      badgeText: 'Best Value',
    },
    {
      name: 'Super Pack',
      description: 'For dedicated supporters',
      points: 2500,
      bonusPoints: 350,
      priceUsd: 24.99,
      isActive: true,
      isFeatured: false,
      sortOrder: 4,
      badgeText: '14% Bonus',
    },
    {
      name: 'Mega Pack',
      description: 'Maximum value for super fans',
      points: 5000,
      bonusPoints: 1000,
      priceUsd: 49.99,
      isActive: true,
      isFeatured: false,
      sortOrder: 5,
      badgeText: '20% Bonus',
    },
    {
      name: 'Ultra Pack',
      description: 'The ultimate package',
      points: 10000,
      bonusPoints: 2500,
      priceUsd: 99.99,
      isActive: true,
      isFeatured: false,
      sortOrder: 6,
      badgeText: '25% Bonus',
    },
  ];

  for (const pkg of packages) {
    await dataSource.query(
      `INSERT INTO point_packages (name, description, points, "bonusPoints", "priceUsd", "isActive", "isFeatured", "sortOrder", "badgeText")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [pkg.name, pkg.description, pkg.points, pkg.bonusPoints, pkg.priceUsd, pkg.isActive, pkg.isFeatured, pkg.sortOrder, pkg.badgeText]
    );
  }
  console.log('Point packages seeded successfully');
};

const seedGifts = async (dataSource: DataSource) => {
  const gifts = [
    // Basic tier
    {
      name: 'Heart',
      description: 'Show some love',
      iconUrl: '❤️',
      pointCost: 10,
      creatorEarnings: 5,
      tier: 'basic',
      sortOrder: 1,
    },
    {
      name: 'Thumbs Up',
      description: 'Great job!',
      iconUrl: '👍',
      pointCost: 15,
      creatorEarnings: 8,
      tier: 'basic',
      sortOrder: 2,
    },
    {
      name: 'Star',
      description: 'You shine bright',
      iconUrl: '⭐',
      pointCost: 25,
      creatorEarnings: 13,
      tier: 'basic',
      sortOrder: 3,
    },
    {
      name: 'Fire',
      description: 'You are on fire!',
      iconUrl: '🔥',
      pointCost: 50,
      creatorEarnings: 25,
      tier: 'basic',
      sortOrder: 4,
    },
    // Standard tier
    {
      name: 'Rose',
      description: 'A beautiful rose for you',
      iconUrl: '🌹',
      pointCost: 100,
      creatorEarnings: 50,
      tier: 'standard',
      sortOrder: 5,
    },
    {
      name: 'Crown',
      description: 'Royalty treatment',
      iconUrl: '👑',
      pointCost: 200,
      creatorEarnings: 100,
      tier: 'standard',
      sortOrder: 6,
    },
    {
      name: 'Rocket',
      description: 'To the moon!',
      iconUrl: '🚀',
      pointCost: 300,
      creatorEarnings: 150,
      tier: 'standard',
      sortOrder: 7,
    },
    // Premium tier
    {
      name: 'Diamond',
      description: 'Precious and rare',
      iconUrl: '💎',
      pointCost: 500,
      creatorEarnings: 250,
      tier: 'premium',
      sortOrder: 8,
    },
    {
      name: 'Unicorn',
      description: 'Magical and unique',
      iconUrl: '🦄',
      pointCost: 750,
      creatorEarnings: 375,
      tier: 'premium',
      sortOrder: 9,
    },
    {
      name: 'Trophy',
      description: 'Champion status',
      iconUrl: '🏆',
      pointCost: 1000,
      creatorEarnings: 500,
      tier: 'premium',
      sortOrder: 10,
    },
    // Legendary tier
    {
      name: 'Supernova',
      description: 'An explosion of support',
      iconUrl: '💥',
      pointCost: 2500,
      creatorEarnings: 1250,
      tier: 'legendary',
      sortOrder: 11,
    },
    {
      name: 'Galaxy',
      description: 'A universe of appreciation',
      iconUrl: '🌌',
      pointCost: 5000,
      creatorEarnings: 2500,
      tier: 'legendary',
      sortOrder: 12,
    },
  ];

  for (const gift of gifts) {
    await dataSource.query(
      `INSERT INTO gifts (name, description, "iconUrl", "pointCost", "creatorEarnings", tier, "sortOrder", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT DO NOTHING`,
      [gift.name, gift.description, gift.iconUrl, gift.pointCost, gift.creatorEarnings, gift.tier, gift.sortOrder]
    );
  }
  console.log('Gifts seeded successfully');
};

const runSeed = async () => {
  console.log('Connecting to database...');
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected');

    await seedPointPackages(dataSource);
    await seedGifts(dataSource);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
};

runSeed();
