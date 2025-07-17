// Language Selector Component - Advanced language selection with dual subtitle support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const LanguageSelector = ({
  visible,
  onClose,
  availableLanguages,
  languageGroups,
  currentPreferences,
  onPreferencesChange
}) => {
  const [selectedTab, setSelectedTab] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempPreferences, setTempPreferences] = useState(currentPreferences || {});
  const [filteredLanguages, setFilteredLanguages] = useState([]);

  useEffect(() => {
    if (currentPreferences) {
      setTempPreferences(currentPreferences);
    }
  }, [currentPreferences]);

  useEffect(() => {
    filterLanguages();
  }, [selectedTab, searchQuery, availableLanguages, languageGroups]);

  const filterLanguages = () => {
    let languages = [];
    
    if (selectedTab === 'all') {
      languages = availableLanguages;
    } else if (selectedTab === 'popular') {
      languages = languageGroups.Popular || [];
    } else {
      languages = languageGroups[selectedTab] || [];
    }

    if (searchQuery) {
      languages = languages.filter(lang =>
        lang.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLanguages(languages);
  };

  const handlePrimaryLanguageSelect = (language) => {
    setTempPreferences(prev => ({
      ...prev,
      primaryLanguage: language
    }));
  };

  const handleSecondaryLanguageSelect = (language) => {
    setTempPreferences(prev => ({
      ...prev,
      secondaryLanguage: language,
      showDualSubtitles: true
    }));
  };

  const handleDualSubtitlesToggle = (value) => {
    setTempPreferences(prev => ({
      ...prev,
      showDualSubtitles: value,
      secondaryLanguage: value ? prev.secondaryLanguage : null
    }));
  };

  const handleFontSizeChange = (type, size) => {
    setTempPreferences(prev => ({
      ...prev,
      fontSettings: {
        ...prev.fontSettings,
        [type]: size
      }
    }));
  };

  const handleDisplayModeChange = (mode) => {
    setTempPreferences(prev => ({
      ...prev,
      translationDisplay: mode
    }));
  };

  const handleSpeedChange = (speed) => {
    setTempPreferences(prev => ({
      ...prev,
      translationSpeed: speed
    }));
  };

  const handleSave = () => {
    onPreferencesChange(tempPreferences);
    onClose();
  };

  const handleReset = () => {
    setTempPreferences(currentPreferences);
  };

  const getLanguageFlag = (language) => {
    // This would typically use a flag library or emoji flags
    const flags = {
      'English': '🇺🇸',
      'German': '🇩🇪',
      'French': '🇫🇷',
      'Spanish': '🇪🇸',
      'Turkish': '🇹🇷',
      'Arabic': '🇸🇦',
      'Urdu': '🇵🇰',
      'Chinese': '🇨🇳',
      'Japanese': '🇯🇵',
      'Korean': '🇰🇷',
      'Italian': '🇮🇹',
      'Dutch': '🇳🇱',
      'Portuguese': '🇵🇹',
      'Russian': '🇷🇺'
    };
    return flags[language] || '🌐';
  };

  const tabs = [
    { key: 'popular', label: 'Popular', icon: 'star' },
    { key: 'European', label: 'European', icon: 'public' },
    { key: 'Asian', label: 'Asian', icon: 'language' },
    { key: 'Islamic', label: 'Islamic', icon: 'mosque' },
    { key: 'all', label: 'All', icon: 'list' }
  ];

  const fontSizes = ['small', 'medium', 'large', 'extra-large'];
  const displayModes = [
    { key: 'bottom', label: 'Bottom', icon: 'vertical-align-bottom' },
    { key: 'overlay', label: 'Overlay', icon: 'layers' },
    { key: 'sidebar', label: 'Sidebar', icon: 'view-sidebar' },
    { key: 'popup', label: 'Popup', icon: 'open-in-new' }
  ];
  const speeds = ['slow', 'normal', 'fast'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#2E7D32', '#4CAF50']}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Translation Settings</Text>
          
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Selection Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Current Selection</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Primary Language:</Text>
              <View style={styles.languageChip}>
                <Text style={styles.languageFlag}>
                  {getLanguageFlag(tempPreferences.primaryLanguage)}
                </Text>
                <Text style={styles.languageText}>
                  {tempPreferences.primaryLanguage || 'English'}
                </Text>
              </View>
            </View>

            {tempPreferences.showDualSubtitles && tempPreferences.secondaryLanguage && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Secondary Language:</Text>
                <View style={styles.languageChip}>
                  <Text style={styles.languageFlag}>
                    {getLanguageFlag(tempPreferences.secondaryLanguage)}
                  </Text>
                  <Text style={styles.languageText}>
                    {tempPreferences.secondaryLanguage}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Dual Subtitles Toggle */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="subtitles" size={20} color="#2E7D32" />
              <Text style={styles.sectionTitle}>Dual Subtitles</Text>
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show two languages simultaneously</Text>
              <Switch
                value={tempPreferences.showDualSubtitles || false}
                onValueChange={handleDualSubtitlesToggle}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={tempPreferences.showDualSubtitles ? '#2E7D32' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Language Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="language" size={20} color="#2E7D32" />
              <Text style={styles.sectionTitle}>Select Languages</Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tabsContainer}
            >
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    selectedTab === tab.key && styles.tabActive
                  ]}
                  onPress={() => setSelectedTab(tab.key)}
                >
                  <Icon 
                    name={tab.icon} 
                    size={16} 
                    color={selectedTab === tab.key ? '#fff' : '#666'} 
                  />
                  <Text style={[
                    styles.tabText,
                    selectedTab === tab.key && styles.tabTextActive
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Language List */}
            <View style={styles.languageGrid}>
              {filteredLanguages.map(language => (
                <View key={language} style={styles.languageItem}>
                  <TouchableOpacity
                    style={[
                      styles.languageButton,
                      tempPreferences.primaryLanguage === language && styles.languageButtonPrimary
                    ]}
                    onPress={() => handlePrimaryLanguageSelect(language)}
                  >
                    <Text style={styles.languageFlag}>
                      {getLanguageFlag(language)}
                    </Text>
                    <Text style={[
                      styles.languageButtonText,
                      tempPreferences.primaryLanguage === language && styles.languageButtonTextPrimary
                    ]}>
                      {language}
                    </Text>
                    {tempPreferences.primaryLanguage === language && (
                      <Icon name="check" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>

                  {/* Secondary language button */}
                  {tempPreferences.showDualSubtitles && language !== tempPreferences.primaryLanguage && (
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        tempPreferences.secondaryLanguage === language && styles.secondaryButtonActive
                      ]}
                      onPress={() => handleSecondaryLanguageSelect(language)}
                    >
                      <Text style={[
                        styles.secondaryButtonText,
                        tempPreferences.secondaryLanguage === language && styles.secondaryButtonTextActive
                      ]}>
                        2nd
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Display Settings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="settings" size={20} color="#2E7D32" />
              <Text style={styles.sectionTitle}>Display Settings</Text>
            </View>

            {/* Font Sizes */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Primary Font Size</Text>
              <View style={styles.optionRow}>
                {fontSizes.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionButton,
                      tempPreferences.fontSettings?.primaryFontSize === size && styles.optionButtonActive
                    ]}
                    onPress={() => handleFontSizeChange('primaryFontSize', size)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      tempPreferences.fontSettings?.primaryFontSize === size && styles.optionButtonTextActive
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {tempPreferences.showDualSubtitles && (
              <View style={styles.settingGroup}>
                <Text style={styles.settingLabel}>Secondary Font Size</Text>
                <View style={styles.optionRow}>
                  {fontSizes.map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.optionButton,
                        tempPreferences.fontSettings?.secondaryFontSize === size && styles.optionButtonActive
                      ]}
                      onPress={() => handleFontSizeChange('secondaryFontSize', size)}
                    >
                      <Text style={[
                        styles.optionButtonText,
                        tempPreferences.fontSettings?.secondaryFontSize === size && styles.optionButtonTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Display Mode */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Display Position</Text>
              <View style={styles.optionRow}>
                {displayModes.map(mode => (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      styles.displayModeButton,
                      tempPreferences.translationDisplay === mode.key && styles.displayModeButtonActive
                    ]}
                    onPress={() => handleDisplayModeChange(mode.key)}
                  >
                    <Icon 
                      name={mode.icon} 
                      size={16} 
                      color={tempPreferences.translationDisplay === mode.key ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.displayModeButtonText,
                      tempPreferences.translationDisplay === mode.key && styles.displayModeButtonTextActive
                    ]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Translation Speed */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>Translation Speed</Text>
              <View style={styles.optionRow}>
                {speeds.map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.optionButton,
                      tempPreferences.translationSpeed === speed && styles.optionButtonActive
                    ]}
                    onPress={() => handleSpeedChange(speed)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      tempPreferences.translationSpeed === speed && styles.optionButtonTextActive
                    ]}>
                      {speed}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Icon name="refresh" size={20} color="#666" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.applyButton} onPress={handleSave}>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#2E7D32',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  languageGrid: {
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  languageButtonPrimary: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  languageButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  languageButtonTextPrimary: {
    color: '#fff',
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  secondaryButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  secondaryButtonTextActive: {
    color: '#fff',
  },
  settingGroup: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  displayModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 4,
  },
  displayModeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  displayModeButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  displayModeButtonTextActive: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default LanguageSelector;
