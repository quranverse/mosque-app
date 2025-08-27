# Mosque Translation App

A comprehensive Islamic mobile application built with React Native and Expo that provides prayer times, Qibla direction, mosque discovery, and live translation features.

## 🌟 Features

### Core Islamic Features
- **Prayer Times**: Accurate Salat times based on your location using the Adhan library
- **Qibla Direction**: Compass pointing to Mecca with real-time accuracy feedback
- **Mosque Discovery**: Find nearby mosques using GPS with distance calculation
- **Account-Free Follow System**: Follow mosques without creating accounts (device-based)

### Live Translation System
- **Real-time Translation**: Arabic-to-English translations via internet broadcasting
- **Live Sessions**: Join live translation sessions from followed mosques
- **Translation History**: View and review past translations
- **Multi-language Support**: Support for multiple target languages

### Additional Features
- **Mosque News**: Updates and announcements from followed mosques
- **Friday Speech Library**: Archive of recorded and translated Friday sermons
- **Event Notifications**: Prayer times, special events, live translations
- **Islamic Design**: Beautiful UI with Islamic aesthetics

## 🏗️ Architecture

### Frontend (React Native + Expo)
```
src/
├── components/
│   ├── PrayerTimes/        # Prayer time components
│   ├── QiblaCompass/       # Qibla direction compass
│   ├── Translation/        # Live translation components
│   └── Common/             # Reusable UI components
├── screens/
│   ├── HomeScreen/         # Main dashboard
│   ├── PrayerTimesScreen/  # Detailed prayer times
│   ├── QiblaScreen/        # Qibla compass
│   ├── TranslationScreen/  # Live translation
│   └── MosqueControlScreen/ # Mosque admin panel
├── services/
│   ├── PrayerTimeService/  # Prayer time calculations
│   ├── LocationService/    # GPS and location handling
│   ├── TranslationService/ # Real-time translation
│   └── QiblaService/       # Qibla calculations
├── utils/                  # Utility functions
└── navigation/             # App navigation
```

### Backend (Node.js + Socket.IO)
- Real-time WebSocket communication for live translations
- RESTful API for mosque data and session management
- Mock server included for development

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio or Xcode (for device testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MosqueTranslationApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Start the mock backend server** (optional, for translation features)
   ```bash
   cd server
   npm install
   npm start
   ```

### Running on Device

1. **Install Expo Go** on your mobile device
2. **Scan the QR code** displayed in the terminal
3. **Grant permissions** for location and sensors when prompted

## 📱 Key Dependencies

### Core Framework
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **React Navigation**: Navigation library

### Islamic Features
- **adhan**: Islamic prayer time calculations
- **moment**: Date and time handling
- **moment-timezone**: Timezone support

### Location & Sensors
- **expo-location**: GPS and location services
- **expo-sensors**: Magnetometer for compass

### Real-time Communication
- **socket.io-client**: WebSocket client for live translations
- **@react-native-async-storage/async-storage**: Local data storage

### UI Components
- **react-native-vector-icons**: Icon library
- **react-native-screens**: Native screen components
- **react-native-safe-area-context**: Safe area handling

## 🕌 Usage

### Prayer Times
1. Open the app and grant location permissions
2. View current prayer times on the home screen
3. Navigate to "Prayer Times" tab for detailed weekly view
4. Set up notifications for prayer reminders

### Qibla Direction
1. Go to the "Qibla" tab
2. Hold your phone flat and calibrate if needed
3. Follow the green indicator pointing to Mecca
4. Use the accuracy meter to ensure proper alignment

### Mosque Discovery
1. The home screen shows nearby mosques automatically
2. Tap "Follow" to receive updates from a mosque
3. View mosque details, contact info, and prayer times
4. Get directions to any mosque

### Live Translation
1. Follow mosques that offer live translation
2. Receive notifications when live sessions start
3. Join sessions to see real-time Arabic-to-English translation
4. View translation history and adjust font size

### Mosque Control (Admin)
1. Access the "Mosque Control" tab
2. Start live translation sessions
3. Manage mosque information and settings
4. View follower statistics

## 🔧 Configuration

### Prayer Time Settings
- Calculation method (default: Moonsighting Committee)
- Madhab selection (Shafi/Hanafi)
- High latitude rule adjustments

### Location Settings
- GPS accuracy preferences
- Automatic location updates
- Manual location override

### Translation Settings
- Default languages
- Font size preferences
- Auto-scroll behavior
- Connection timeout settings

## 🌐 API Endpoints

### Mock Server Endpoints
- `GET /api/mosques` - Get nearby mosques
- `GET /api/sessions/active` - Get active translation sessions
- `GET /api/status` - Server status and statistics

### WebSocket Events
- `join_session` - Join a translation session
- `leave_session` - Leave a session
- `start_session` - Start broadcasting (admin)
- `end_session` - End broadcasting (admin)
- `send_translation` - Send translation (admin)
- `translation_update` - Receive translations
- `session_started` - Session started notification
- `session_ended` - Session ended notification

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Manual Testing Checklist
- [ ] Prayer times display correctly for your location
- [ ] Qibla compass points accurately to Mecca
- [ ] Location permissions work properly
- [ ] Mosque discovery shows nearby mosques
- [ ] Follow/unfollow functionality works
- [ ] Live translation connects and receives updates
- [ ] Font size and display settings work
- [ ] Navigation between screens is smooth

## 🔒 Privacy & Permissions

### Required Permissions
- **Location**: For prayer times and mosque discovery
- **Sensors**: For Qibla compass functionality

### Data Storage
- All data is stored locally on the device
- No personal information is collected
- Device ID is generated locally for session management
- Followed mosques are stored in local storage

### Network Usage
- Location-based mosque discovery
- Real-time translation sessions
- Prayer time calculations (offline after initial setup)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow React Native best practices
- Use TypeScript for new components
- Add tests for new features
- Update documentation for API changes
- Ensure Islamic accuracy for religious features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Adhan Library**: For accurate Islamic prayer time calculations
- **Islamic Society of North America**: For calculation method guidelines
- **Expo Team**: For the excellent development platform
- **React Native Community**: For the amazing ecosystem

## 📞 Support

For support, questions, or suggestions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation wiki

## 🗺️ Roadmap

### Upcoming Features
- [ ] Offline mode for prayer times
- [ ] Multiple language translations
- [ ] Voice translation support
- [ ] Mosque ratings and reviews
- [ ] Event calendar integration
- [ ] Hijri calendar support
- [ ] Tasbih counter
- [ ] Islamic calendar events

### Long-term Goals
- [ ] Web version for smart TVs
- [ ] Chromecast integration
- [ ] AI-powered translation improvements
- [ ] Community features
- [ ] Mosque verification system
- [ ] Advanced analytics for mosques

---

**Made with ❤️ for the Muslim community**
