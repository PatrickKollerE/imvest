# Imvest - Real Estate Investment & Management Platform

A scalable, cloud-native web application for private landlords and small investors to manage rental properties and evaluate potential acquisitions.

## Features

### Core MVP Features
- **User Management**: Multi-tenant architecture with secure data separation
- **Property Management**: Add and manage rental properties with detailed information
- **Tenant Management**: Track tenants, lease terms, and rent payments
- **Income & Expense Tracking**: Record and categorize all property-related transactions
- **ROI Analysis**: Comprehensive investment evaluation with cashflow forecasting
- **Utility Cost Allocation**: Distribute utility costs among tenants
- **Export Capabilities**: CSV/PDF exports for financial reporting

### Technical Features
- **Cloud-Native**: Designed for GCP deployment with Docker containers
- **Scalable Architecture**: Multi-tenant, stateless backend supporting thousands of users
- **Performance Optimized**: Caching, connection pooling, and optimized queries
- **Security**: JWT-based authentication, data isolation, security headers

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (production), SQLite (development)
- **Authentication**: NextAuth.js with credentials provider
- **Deployment**: Docker, Google Cloud Run
- **Caching**: In-memory (dev), Redis (production)

## Quick Start

### Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   - Navigate to http://localhost:3000
   - Register a new account
   - Start managing your properties!

### Production with Docker

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Or build individual container**
   ```bash
   docker build -t imvest .
   docker run -p 3000:3000 imvest
   ```

## GCP Deployment

### Prerequisites
- Google Cloud SDK installed
- GCP project with billing enabled
- Cloud Run API enabled

### Deploy to Google Cloud Run

1. **Set up environment variables in GCP**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Configure secrets**
   ```bash
   gcloud secrets create database-url --data-file=- <<< "postgresql://..."
   gcloud secrets create nextauth-secret --data-file=- <<< "your-secret-key"
   ```

3. **Deploy using Cloud Build**
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `REDIS_URL` | Redis connection string (production) | No |

## Architecture

### Multi-Tenant Design
- **Organizations**: Top-level tenant isolation
- **Users**: Belong to one or more organizations
- **Properties**: Scoped to organizations
- **Data Isolation**: All queries filtered by organization ID

### Scalability Features
- **Stateless Backend**: No server-side sessions
- **Connection Pooling**: Prisma connection management
- **Caching**: Redis for session and data caching
- **Horizontal Scaling**: Cloud Run auto-scaling
- **Database Optimization**: Indexed queries, efficient aggregations

### Security
- **Authentication**: JWT-based with NextAuth.js
- **Authorization**: Organization-based access control
- **Data Validation**: Zod schema validation
- **Security Headers**: CSP, HSTS, XSS protection
- **Input Sanitization**: SQL injection prevention via Prisma

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Properties
- `GET /properties` - List user's properties
- `POST /properties` - Create new property
- `GET /properties/[id]` - Get property details
- `PUT /properties/[id]` - Update property
- `DELETE /properties/[id]` - Delete property

### Tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants` - List property tenants
- `PUT /api/tenants/[id]` - Update tenant
- `DELETE /api/tenants/[id]` - Delete tenant

### Evaluations
- `POST /api/evaluations` - Create investment evaluation
- `GET /api/evaluations` - List evaluations

## Database Schema

The application uses a multi-tenant schema with the following key entities:

- **Organizations**: Top-level tenant containers
- **Users**: Authentication and user management
- **Properties**: Real estate assets
- **Tenants**: Property occupants
- **Income/Expenses**: Financial transactions
- **Evaluations**: Investment analysis results

## Performance Considerations

### Caching Strategy
- **User Sessions**: Cached in Redis
- **Organization Data**: 5-minute TTL
- **Property Stats**: 10-minute TTL
- **Portfolio Data**: 15-minute TTL

### Database Optimization
- **Indexes**: On foreign keys and frequently queried fields
- **Connection Pooling**: Prisma connection management
- **Query Optimization**: Efficient aggregations and joins
- **Pagination**: Large dataset handling

### Monitoring
- **Application Metrics**: Response times, error rates
- **Database Metrics**: Query performance, connection usage
- **Infrastructure Metrics**: CPU, memory, network usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details