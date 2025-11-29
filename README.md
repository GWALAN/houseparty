# Expo SDK 54 Mobile App Template

A production-ready mobile app template built with Expo SDK 54, featuring modern design, TypeScript, and a scalable architecture.

## ✨ Features

- **Expo SDK 54** - Latest Expo version with full Expo Go compatibility
- **TypeScript** - Type-safe development experience
- **Tab Navigation** - Clean navigation structure using Expo Router
- **Reusable Components** - Button, Card, Header components with variants
- **Modern Design System** - Consistent colors, spacing, and typography
- **Production Ready** - Organized structure with proper error handling

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Scan the QR code with Expo Go to view the app on your device

## 📱 App Structure

```
app/
├── (tabs)/                 # Tab navigation screens
│   ├── _layout.tsx        # Tab bar configuration
│   ├── index.tsx          # Home screen
│   ├── explore.tsx        # Explore screen
│   └── profile.tsx        # Profile screen
├── _layout.tsx            # Root layout
└── +not-found.tsx         # 404 screen

components/
├── Button.tsx             # Reusable button component
├── Card.tsx               # Card container component
└── Header.tsx             # Page header component

constants/
├── Colors.ts              # Color palette
└── Spacing.ts             # Spacing and layout constants

types/
└── index.ts               # TypeScript type definitions
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#2563eb)
- **Secondary**: Purple (#7c3aed) 
- **Success**: Green (#059669)
- **Error**: Red (#dc2626)

### Components

#### Button
```tsx
<Button 
  title="Click me"
  variant="primary" // primary, secondary, danger
  size="medium"     // small, medium, large
  onPress={() => {}}
/>
```

#### Card
```tsx
<Card style={customStyles}>
  <Text>Card content</Text>
</Card>
```

#### Header
```tsx
<Header 
  title="Page Title"
  subtitle="Optional subtitle"
/>
```

## 📚 Screens

### Home (`/`)
- Welcome message with app features
- Feature cards showcasing capabilities
- Call-to-action button

### Explore (`/explore`)
- Search functionality
- List of places with metadata
- Interactive filtering

### Profile (`/profile`)
- User information display
- Settings menu items
- Account management options

## 🔧 Customization

### Adding New Screens
1. Create a new file in `app/(tabs)/`
2. Add the screen to the tab configuration in `app/(tabs)/_layout.tsx`
3. Import necessary components from the `components/` directory

### Modifying Colors
Update the color palette in `constants/Colors.ts` to match your brand.

### Creating New Components
Follow the existing component structure in the `components/` directory with proper TypeScript interfaces.

## 📱 Platform Support

- ✅ iOS (Expo Go + Development Build)
- ✅ Android (Expo Go + Development Build) 
- ✅ Web (Limited - for development only)

## 🚀 Deployment

### Development Build
```bash
eas build --platform all
```

### Production Build
```bash
eas build --platform all --profile production
```

## 🤝 Contributing

This template is designed to be a starting point for your projects. Feel free to:

- Add new features and screens
- Customize the design system
- Integrate additional libraries
- Share improvements back to the community

## 📄 License

This template is open source and available under the MIT License.

## 📞 Support

For questions about Expo SDK 54 or this template:
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Community Discord](https://discord.gg/expo)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)