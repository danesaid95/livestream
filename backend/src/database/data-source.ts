import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Support Heroku's DATABASE_URL or individual connection params
const getDataSourceOptions = (): DataSourceOptions => {
  const baseOptions = {
    type: 'postgres' as const,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'production', // Auto-sync for initial deployment
    logging: process.env.NODE_ENV === 'development',
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseOptions,
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    ...baseOptions,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'livestream',
  };
};

export const dataSourceOptions: DataSourceOptions = getDataSourceOptions();

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
