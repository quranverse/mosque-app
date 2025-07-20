import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import services and components
import SpeechLibraryService from '../../services/SpeechLibraryService/SpeechLibraryService';
import Card from '../../components/Common/Card';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ErrorMessage from '../../components/Common/ErrorMessage';

const SpeechLibraryScreen = ({ navigation }) => {
  const [speeches, setSpeeches] = useState([]);
  const [filteredSpeeches, setFilteredSpeeches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [viewMode, setViewMode] = useState('recent'); // 'recent', 'popular', 'favorites'

  useEffect(() => {
    initializeLibrary();
  }, []);

  useEffect(() => {
    filterSpeeches();
  }, [speeches, searchQuery, selectedCategory, viewMode]);

  const initializeLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allSpeeches, allCategories] = await Promise.all([
        SpeechLibraryService.getAllSpeeches(),
        SpeechLibraryService.getCategories(),
      ]);
      
      setSpeeches(allSpeeches);
      setCategories(['All', ...allCategories]);
    } catch (err) {
      console.error('Error initializing library:', err);
      setError('Failed to load speech library');
    } finally {
      setLoading(false);
    }
  };

  const filterSpeeches = async () => {
    try {
      let filtered = speeches;

      // Apply view mode filter
      if (viewMode === 'favorites') {
        filtered = filtered.filter(speech => speech.isFavorite);
      } else if (viewMode === 'downloaded') {
        filtered = filtered.filter(speech => speech.isDownloaded);
      }

      // Apply category filter
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(speech => speech.category === selectedCategory);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(speech =>
          speech.title.toLowerCase().includes(query) ||
          speech.speaker.toLowerCase().includes(query) ||
          speech.description.toLowerCase().includes(query) ||
          speech.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Sort based on view mode
      if (viewMode === 'recent') {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (viewMode === 'popular') {
        filtered.sort((a, b) => b.views - a.views);
      }

      setFilteredSpeeches(filtered);
    } catch (err) {
      console.error('Error filtering speeches:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeLibrary();
    setRefreshing(false);
  };

  const toggleFavorite = async (speechId) => {
    try {
      const speech = speeches.find(s => s.id === speechId);
      if (!speech) return;

      if (speech.isFavorite) {
        await SpeechLibraryService.removeFromFavorites(speechId);
      } else {
        await SpeechLibraryService.addToFavorites(speechId);
      }

      // Update local state
      setSpeeches(prev => prev.map(s => 
        s.id === speechId ? { ...s, isFavorite: !s.isFavorite } : s
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const playSpeech = async (speech) => {
    try {
      await SpeechLibraryService.addToPlaybackHistory(speech.id);
      await SpeechLibraryService.incrementViews(speech.id);
      
      // Navigate to speech player (would be implemented)
      Alert.alert(
        'Play Speech',
        `Playing: ${speech.title}\nBy: ${speech.speaker}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error playing speech:', error);
      Alert.alert('Error', 'Failed to play speech');
    }
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search speeches, speakers, topics..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* View Mode Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {[
          { key: 'recent', label: 'Recent', icon: 'schedule' },
          { key: 'popular', label: 'Popular', icon: 'trending-up' },
          { key: 'favorites', label: 'Favorites', icon: 'favorite' },
          { key: 'downloaded', label: 'Downloaded', icon: 'download' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, viewMode === tab.key && styles.activeTab]}
            onPress={() => setViewMode(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={viewMode === tab.key ? '#fff' : '#666'} 
            />
            <Text style={[styles.tabText, viewMode === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryChip, selectedCategory === category && styles.activeCategoryChip]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryText, selectedCategory === category && styles.activeCategoryText]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSpeechItem = ({ item: speech }) => (
    <Card style={styles.speechCard} onPress={() => playSpeech(speech)}>
      <View style={styles.speechHeader}>
        <View style={styles.speechInfo}>
          <Text style={styles.speechTitle} numberOfLines={2}>
            {speech.title}
          </Text>
          <Text style={styles.speechSpeaker}>
            {speech.speaker} • {speech.mosqueName}
          </Text>
          <Text style={styles.speechDate}>
            {SpeechLibraryService.formatSpeechDate(speech.date)} • {SpeechLibraryService.formatSpeechDuration(speech.duration)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(speech.id)}
        >
          <Icon
            name={speech.isFavorite ? 'favorite' : 'favorite-border'}
            size={24}
            color={speech.isFavorite ? '#F44336' : '#666'}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.speechDescription} numberOfLines={2}>
        {speech.description}
      </Text>

      <View style={styles.speechFooter}>
        <View style={styles.speechTags}>
          {speech.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.speechStats}>
          <View style={styles.statItem}>
            <Icon name="visibility" size={14} color="#666" />
            <Text style={styles.statText}>{speech.views}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="thumb-up" size={14} color="#666" />
            <Text style={styles.statText}>{speech.likes}</Text>
          </View>
          {speech.isDownloaded && (
            <Icon name="download-done" size={16} color="#4CAF50" />
          )}
        </View>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="library-music" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No speeches found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try adjusting your search terms' : 'Check back later for new content'}
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading speech library..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={initializeLibrary} />;
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      {renderFilters()}
      
      <FlatList
        data={filteredSpeeches}
        renderItem={renderSpeechItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeCategoryChip: {
    backgroundColor: '#E8F5E8',
    borderColor: '#2E7D32',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  activeCategoryText: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  listContainer: {
    padding: 15,
  },
  speechCard: {
    marginBottom: 15,
    padding: 15,
  },
  speechHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  speechInfo: {
    flex: 1,
    marginRight: 10,
  },
  speechTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  speechSpeaker: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  speechDate: {
    fontSize: 12,
    color: '#999',
  },
  favoriteButton: {
    padding: 5,
  },
  speechDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  speechFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speechTags: {
    flexDirection: 'row',
    flex: 1,
  },
  tag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
  },
  tagText: {
    fontSize: 10,
    color: '#2E7D32',
  },
  speechStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default SpeechLibraryScreen;
