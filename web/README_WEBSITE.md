# Proper Place Website

A modern Next.js website for the Proper Place platform - featuring venue browsing, booking, and host management.

## Features

- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Venue Browsing**: Search and filter available venues
- **Host Dashboard**: Professional interface for hosts to manage listings
- **Host Contact Form**: Professional inquiry form for potential hosts
- **User Authentication**: Secure login and signup system
- **Modern UI**: Built with Tailwind CSS for a professional look

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
cd web
npm install
```

### Development

```bash
npm run dev
```

The website will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Update `NEXT_PUBLIC_API_URL` to point to your backend API endpoint.

## Project Structure

```
web/
├── app/                    # Next.js app directory (routing)
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout with Navbar & Footer
│   ├── globals.css        # Global styles
│   ├── browse/            # Browse venues page
│   ├── become-host/       # Host signup & guide
│   ├── contact-host/      # Host inquiry form
│   └── auth/              # Authentication pages
│       ├── login/
│       └── signup/
├── components/            # Reusable React components
│   ├── Navbar.tsx
│   └── Footer.tsx
├── public/               # Static assets
└── lib/                  # Utility functions
```

## Styling

This project uses:
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: Global styles in `app/globals.css`
- **Color Scheme**: Dark blue background with light blue accents

## API Integration

The website integrates with the Proper Place backend API. Key endpoints used:

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/contacts` - Host inquiries
- `GET /api/places` - Fetch venues (for browse page)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Deployment

The website can be deployed to various platforms:

- **Vercel** (recommended for Next.js): `vercel deploy`
- **Netlify**: Connect your GitHub/GitLab repository
- **Docker**: Use the provided Dockerfile
- **Traditional hosting**: Build and deploy the `out` folder

## Development Tips

1. **Hot Reload**: Changes are automatically reflected in the browser during development
2. **TypeScript**: This project uses TypeScript for type safety
3. **Component Reusability**: Create reusable components in the `components` folder
4. **Environment Variables**: Always add new env vars to `.env.local` and prefix public ones with `NEXT_PUBLIC_`

## Troubleshooting

**API Connection Issues:**
- Ensure the backend is running on the configured `NEXT_PUBLIC_API_URL`
- Check CORS settings in the backend API

**Styling Issues:**
- Clear the `.next` cache: `rm -rf .next`
- Rebuild: `npm run build`

**Port Already in Use:**
- Change the dev port: `npm run dev -- -p 3001`

## Support

For issues or questions, please refer to the main Proper Place project documentation.

## License

Proper Place © 2025
