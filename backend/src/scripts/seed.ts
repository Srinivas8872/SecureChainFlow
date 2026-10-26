import { connectDatabase, disconnectDatabase } from '../config/database';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { logger } from '../config/logger';

export async function seedDatabase() {
  logger.info('Starting database seeding...');
  await connectDatabase();

  // 1. Seed Organizations
  const organizationsData = [
    {
      name: 'SecureChainFlow Consortium Admin',
      type: 'ADMIN' as const,
      status: 'VERIFIED' as const,
      facilities: ['Global Operations Center']
    },
    {
      name: 'AgriHarvest Organics Ltd',
      type: 'SUPPLIER' as const,
      status: 'VERIFIED' as const,
      facilities: ['Farm Field Alpha', 'Processing Plant 01']
    },
    {
      name: 'Apex BioProcessing Corp',
      type: 'MANUFACTURER' as const,
      status: 'VERIFIED' as const,
      facilities: ['Refinery Lab North', 'Packaging Line 4']
    },
    {
      name: 'SwiftFreight Global Logistics',
      type: 'LOGISTICS' as const,
      status: 'VERIFIED' as const,
      facilities: ['Fleet Depot West', 'Air Cargo Terminal 2']
    },
    {
      name: 'Metro Cold Storage Hub',
      type: 'WAREHOUSING' as const,
      status: 'VERIFIED' as const,
      facilities: ['Freezer Zone A', 'Dry Storage Bay 12']
    },
    {
      name: 'Prime Retail Supermarkets',
      type: 'RETAIL' as const,
      status: 'VERIFIED' as const,
      facilities: ['Distribution Center 5', 'Store #104']
    },
    {
      name: 'Global Supply Chain Standards Bureau',
      type: 'AUDIT' as const,
      status: 'VERIFIED' as const,
      facilities: ['Compliance Inspection Lab']
    }
  ];

  const orgMap: Record<string, any> = {};

  for (const orgData of organizationsData) {
    let org = await Organization.findOne({ name: orgData.name });
    if (!org) {
      org = await Organization.create(orgData);
      logger.info(`Created Organization: ${org.name}`);
    }
    orgMap[orgData.type] = org;
  }

  // 2. Seed Users for each supply chain role
  const usersData = [
    {
      name: 'Platform Administrator',
      email: 'admin@securechainflow.com',
      password: 'Password@123',
      role: 'ADMIN' as const,
      org: orgMap['ADMIN']
    },
    {
      name: 'Alice Green (Organic Farmer)',
      email: 'supplier@agri-corp.com',
      password: 'Password@123',
      role: 'SUPPLIER' as const,
      org: orgMap['SUPPLIER']
    },
    {
      name: 'Bob Miller (Plant Engineer)',
      email: 'processor@apex-foods.com',
      password: 'Password@123',
      role: 'PROCESSOR' as const,
      org: orgMap['MANUFACTURER']
    },
    {
      name: 'Charlie Vance (Logistics Dispatcher)',
      email: 'transporter@swift-freight.com',
      password: 'Password@123',
      role: 'TRANSPORTER' as const,
      org: orgMap['LOGISTICS']
    },
    {
      name: 'David Zhao (Warehouse Supervisor)',
      email: 'warehouse@metro-storage.com',
      password: 'Password@123',
      role: 'WAREHOUSE' as const,
      org: orgMap['WAREHOUSING']
    },
    {
      name: 'Elena Rostova (Store Manager)',
      email: 'retailer@prime-market.com',
      password: 'Password@123',
      role: 'RETAILER' as const,
      org: orgMap['RETAIL']
    },
    {
      name: 'Franklin Hughes (Lead Auditor)',
      email: 'auditor@iso-cert.org',
      password: 'Password@123',
      role: 'REGULATOR' as const,
      org: orgMap['AUDIT']
    }
  ];

  for (const u of usersData) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({
        name: u.name,
        email: u.email,
        passwordHash: u.password,
        role: u.role,
        organizationId: u.org._id,
        status: 'ACTIVE'
      });
      logger.info(`Created User: ${user.name} (${user.email}) [Role: ${user.role}]`);
    }
  }

  logger.info('Database seeding completed successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Seeding error:', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
