Please implement the following professional improvements to the mosque app to create a proper separation between mosque broadcasting and individual user functionality:

**1. Navigation Structure Cleanup**
- Remove the Demo/StructureDemo screen entirely as it's not needed in production
- Implement a 5-tab navigation structure that differs based on user type:
  - **Mosque accounts**: Prayer Times (default), Broadcasting, Tweet/Announcements, Qibla, Settings
  - **Individual accounts**: Prayer Times (default), Translation, Tweet/Announcements, Qibla, Settings

**2. Mosque Account Functionality Redesign**
- Remove the existing "Mosque Control" screen completely
- Remove all translation reception features from mosque accounts (they broadcast, not receive)
- Replace the "Translation" tab with "Broadcasting" tab for mosque accounts
- Add voice recording/microphone functionality to the Broadcasting screen
- Enable mosques to start live audio broadcasts that individual users can join for translation

**3. Individual Account Functionality**
- Keep the existing "Translation" tab for individual users
- Maintain the mosque following/management functionality (heart icon)
- Allow individuals to join live broadcasts from mosques they follow
- Preserve the horizontal translation screen for receiving live translations

**4. Prayer Times Screen Navigation Fix**
- Fix the persistent heart icon (❤️) issue that's currently blocking the prayer times view
- Ensure the mosque management icon is accessible but doesn't obstruct the main content
- The prayer times should be clearly visible as the default screen without navigation interference
- Implement proper conditional rendering based on user type

**5. User Type Logic Implementation**
- Implement clear separation in AuthService.USER_TYPES logic:
  - `INDIVIDUAL`: Access to translation reception, mosque following, prayer times viewing
  - `MOSQUE_ADMIN`: Access to broadcasting, mosque profile management, prayer times display
- Ensure navigation tabs render conditionally based on user type
- Remove any cross-functionality (mosques shouldn't see translation options, individuals shouldn't see broadcasting controls)

**6. Broadcasting vs Translation Logic**
- Mosque Broadcasting: Record/stream live audio of sermons and prayers
- Individual Translation: Receive and view real-time translations of live broadcasts
- Ensure proper WebSocket/Socket.IO integration for real-time communication between broadcasters and receivers

Please implement these changes systematically, starting with the navigation structure cleanup and user type separation, then implementing the broadcasting functionality for mosques and fixing the prayer times screen navigation issue.