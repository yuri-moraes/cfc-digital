This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment to Vercel

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository (for CI/CD integration)
- Backend API deployed (get the URL from backend deployment)

### Frontend Deployment Steps

1. Create a new project in Vercel:
   - Link to the `cfc-digital` GitHub repository
   - Vercel will auto-detect Next.js project

2. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Backend API base URL
     - Example: `https://cfc-digital-backend.vercel.app/api`
     - This must be set AFTER the backend is deployed

3. Deploy:
   - Push to main branch or use Vercel dashboard's deploy button
   - Vercel automatically builds and deploys Next.js apps
   - Frontend will be available at Vercel's provided URL

### Environment Variable Configuration
- The `NEXT_PUBLIC_API_URL` is configured in `next.config.mjs`
- In development, it defaults to `http://localhost:3001/api`
- In production, it reads from the Vercel environment variable
- The variable name starts with `NEXT_PUBLIC_` so it's available in the browser

### Backend Integration
- The frontend communicates with the backend via the `NEXT_PUBLIC_API_URL` environment variable
- Ensure CORS is properly configured on the backend to allow requests from the frontend domain
- For local development, the backend should run on port 3001

For more details on Next.js deployment, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
# cfc-digital
