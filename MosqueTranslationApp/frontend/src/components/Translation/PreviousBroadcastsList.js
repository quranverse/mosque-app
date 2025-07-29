// Previous Broadcasts List Component with Enhanced Filtering
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../../services/ApiService/ApiService';
import SpotifyLikePlayer from '../Audio/SpotifyLikePlayer';

const PreviousBroadcastsList = ({
  mosqueId,
  onRefresh,
  refreshing = false,
  searchQuery = '',
}) => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [filteredBroadcasts, setFilteredBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTimeFilter, setActiveTimeFilter] = useState('all');

  useEffect(() => {
    if (mosqueId) {
      loadPreviousBroadcasts();
    }
  }, [mosqueId]);

  useEffect(() => {
    applyFilters();
  }, [broadcasts, activeFilter, activeTimeFilter, searchQuery]);

  const loadPreviousBroadcasts = async (typeFilter = 'all', timeFilter = 'all') => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        limit: '50',
        type: typeFilter,
        timeFilter: timeFilter
      });

      // Load real data from API with filters
      const response = await ApiService.get(`/sessions/history/${mosqueId}?${params}`);

      if (response?.success && response.sessions) {
        // Use the enhanced data from backend
        setBroadcasts(response.sessions);
      } else {
        // Enhanced mock data with more variety
        console.warn('API failed, using enhanced mock data');
        setBroadcasts(generateMockBroadcasts());
      }
    } catch (error) {
      console.error('Error loading previous broadcasts:', error);
      // Use mock data on error
      setBroadcasts(generateMockBroadcasts());
    } finally {
      setLoading(false);
    }
  };

  const generateMockBroadcasts = () => {
    const types = ['friday_prayer', 'lecture', 'quran_recitation', 'dua', 'islamic_course'];
    const titles = {
      friday_prayer: ['Friday Prayer - Surah Al-Fatiha', 'Jummah Khutbah - Patience in Islam', 'Friday Sermon - Unity of Ummah'],
      lecture: ['Islamic Ethics in Daily Life', 'The Importance of Prayer', 'Understanding Quran', 'Islamic History Lesson'],
      quran_recitation: ['Surah Al-Baqarah Recitation', 'Surah Yasin Complete', 'Surah Al-Mulk Evening Recitation'],
      dua: ['Evening Duas and Supplications', 'Morning Adhkar Session', 'Dua for Guidance'],
      islamic_course: ['Arabic Language Course - Week 1', 'Fiqh Fundamentals - Week 2', 'Hadith Studies - Week 3']
    };

    const mockData = [];
    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const typeTitle = titles[type][Math.floor(Math.random() * titles[type].length)];
      const daysAgo = Math.floor(Math.random() * 30) + 1;

      mockData.push({
        id: `session_${i + 1}`,
        title: typeTitle,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        duration: (15 + Math.floor(Math.random() * 60)) * 60 * 1000, // 15-75 minutes
        language: 'Arabic',
        imam: ['Sheikh Ahmed', 'Imam Hassan', 'Dr. Omar'][Math.floor(Math.random() * 3)],
        audioUrl: `/api/audio/recordings/session_${i + 1}.m4a`,
        transcription: generateMockTranscription(type),
        translations: generateMockTranslations(type),
        participantCount: Math.floor(Math.random() * 100) + 10,
        type: type
      });
    }
    return mockData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const generateMockTranscription = (type) => {
    const transcriptions = {
      friday_prayer: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. الحمد لله رب العالمين. الرحمن الرحيم. مالك يوم الدين...',
      lecture: 'الحمد لله رب العالمين، والصلاة والسلام على أشرف المرسلين، سيدنا محمد وعلى آله وصحبه أجمعين...',
      quran_recitation: 'الم ذَلِكَ الْكِتَابُ لاَ رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ...',
      dua: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة...',
      islamic_course: 'في هذا الدرس سنتعلم أساسيات اللغة العربية والقواعد النحوية المهمة للفهم الصحيح...'
    };
    return transcriptions[type] || transcriptions.lecture;
  };

  const generateMockTranslations = (type) => {
    const translations = {
      friday_prayer: {
        english: 'In the name of Allah, the Most Gracious, the Most Merciful. Praise be to Allah, Lord of the worlds...',
        urdu: 'اللہ کے نام سے جو بہت مہربان، نہایت رحم والا ہے۔ تمام تعریفیں اللہ کے لیے ہیں...'
      },
      lecture: {
        english: 'Praise be to Allah, Lord of the worlds, and peace and blessings upon the most noble of messengers...',
        urdu: 'تمام تعریفیں اللہ کے لیے ہیں، اور درود و سلام ہو سب سے بہترین رسول پر...'
      },
      quran_recitation: {
        english: 'Alif-Lam-Mim. This is the Book about which there is no doubt, a guidance for those conscious of Allah...',
        urdu: 'الم۔ یہ وہ کتاب ہے جس میں کوئی شک نہیں، یہ ہدایت ہے پرہیزگاروں کے لیے...'
      }
    };
    return translations[type] || translations.lecture;
  };

  const getSessionTypeFromTitle = (title) => {
    if (title.toLowerCase().includes('friday') || title.toLowerCase().includes('jummah')) return 'friday_prayer';
    if (title.toLowerCase().includes('lecture') || title.toLowerCase().includes('sermon')) return 'lecture';
    if (title.toLowerCase().includes('quran') || title.toLowerCase().includes('recitation')) return 'quran_recitation';
    if (title.toLowerCase().includes('dua') || title.toLowerCase().includes('supplication')) return 'dua';
    if (title.toLowerCase().includes('course') || title.toLowerCase().includes('lesson')) return 'islamic_course';
    return 'lecture';
  };

  const applyFilters = () => {
    let filtered = [...broadcasts];

    // Apply search query filter (client-side for real-time search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(broadcast =>
        broadcast.title.toLowerCase().includes(query) ||
        broadcast.imam.toLowerCase().includes(query) ||
        getTypeLabel(broadcast.type).toLowerCase().includes(query) ||
        broadcast.transcription?.toLowerCase().includes(query)
      );
    }

    setFilteredBroadcasts(filtered);
  };

  const handleFilterChange = (newFilter, filterType) => {
    if (filterType === 'content') {
      setActiveFilter(newFilter);
    } else if (filterType === 'time') {
      setActiveTimeFilter(newFilter);
    }

    // Reload data with new filters
    loadPreviousBroadcasts(
      filterType === 'content' ? newFilter : activeFilter,
      filterType === 'time' ? newFilter : activeTimeFilter
    );
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (milliseconds) => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'friday_prayer': return 'mosque';
      case 'lecture': return 'school';
      case 'quran_recitation': return 'menu-book';
      case 'dua': return 'favorite';
      case 'islamic_course': return 'class';
      default: return 'record-voice-over';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'friday_prayer': return '#4CAF50';
      case 'lecture': return '#2196F3';
      case 'quran_recitation': return '#FF9800';
      case 'dua': return '#9C27B0';
      case 'islamic_course': return '#FF5722';
      default: return '#9E9E9E';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'friday_prayer': return 'Friday Prayer';
      case 'lecture': return 'Lecture';
      case 'quran_recitation': return 'Quran Recitation';
      case 'dua': return 'Dua & Supplications';
      case 'islamic_course': return 'Islamic Course';
      default: return 'General';
    }
  };

  const handlePlayBroadcast = (broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedBroadcast(null);
  };

  const renderBroadcast = ({ item: broadcast }) => {
    return (
      <TouchableOpacity
        style={styles.broadcastCard}
        onPress={() => handlePlayBroadcast(broadcast)}
        activeOpacity={0.7}
      >
        <View style={styles.broadcastHeader}>
          <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(broadcast.type) }]}>
            <Icon
              name={getTypeIcon(broadcast.type)}
              size={20}
              color="#fff"
            />
          </View>

          <View style={styles.broadcastInfo}>
            <Text style={styles.broadcastTitle} numberOfLines={2}>
              {broadcast.title}
            </Text>
            <Text style={styles.broadcastSubtitle}>
              {broadcast.imam} • {formatDate(broadcast.date)}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name="access-time" size={14} color="#999" />
                <Text style={styles.metaText}>{formatDuration(broadcast.duration)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="people" size={14} color="#999" />
                <Text style={styles.metaText}>{broadcast.participantCount}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{getTypeLabel(broadcast.type)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.playButton}>
            <Icon name="play-arrow" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filter, label, isActive, onPress) => (
    <TouchableOpacity
      key={filter}
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Content Type Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterSectionTitle}>Content Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {renderFilterButton('all', 'All', activeFilter === 'all', () => handleFilterChange('all', 'content'))}
          {renderFilterButton('friday_prayer', 'Friday Prayer', activeFilter === 'friday_prayer', () => handleFilterChange('friday_prayer', 'content'))}
          {renderFilterButton('lecture', 'Lectures', activeFilter === 'lecture', () => handleFilterChange('lecture', 'content'))}
          {renderFilterButton('quran_recitation', 'Quran', activeFilter === 'quran_recitation', () => handleFilterChange('quran_recitation', 'content'))}
          {renderFilterButton('dua', 'Duas', activeFilter === 'dua', () => handleFilterChange('dua', 'content'))}
          {renderFilterButton('islamic_course', 'Courses', activeFilter === 'islamic_course', () => handleFilterChange('islamic_course', 'content'))}
        </ScrollView>
      </View>

      {/* Time Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterSectionTitle}>Time Period</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {renderFilterButton('all', 'All Time', activeTimeFilter === 'all', () => handleFilterChange('all', 'time'))}
          {renderFilterButton('today', 'Today', activeTimeFilter === 'today', () => handleFilterChange('today', 'time'))}
          {renderFilterButton('week', 'This Week', activeTimeFilter === 'week', () => handleFilterChange('week', 'time'))}
          {renderFilterButton('month', 'This Month', activeTimeFilter === 'month', () => handleFilterChange('month', 'time'))}
        </ScrollView>
      </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredBroadcasts.length} recording{filteredBroadcasts.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Broadcasts List */}
      <FlatList
        data={filteredBroadcasts}
        renderItem={renderBroadcast}
        keyExtractor={(item) => item.id}
        style={styles.broadcastsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Icon name={searchQuery ? "search-off" : "history"} size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No search results' : 'No recordings found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No recordings match "${searchQuery}". Try a different search term.`
                  : activeFilter !== 'all' || activeTimeFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : 'Previous broadcast recordings will appear here'
                }
              </Text>
            </View>
          )
        }
      />

      {/* Spotify-like Player */}
      <SpotifyLikePlayer
        broadcast={selectedBroadcast}
        isVisible={showPlayer}
        onClose={handleClosePlayer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  broadcastsList: {
    flex: 1,
  },
  broadcastCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  typeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  broadcastInfo: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  broadcastSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  typeBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  typeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
  },
});

export default PreviousBroadcastsList;
