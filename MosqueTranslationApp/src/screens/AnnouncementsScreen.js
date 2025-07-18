import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AuthService from '../services/AuthService/AuthService';

const AnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    await loadAnnouncements();
    setLoading(false);
  };

  const loadAnnouncements = async () => {
    try {
      // Mock announcements data
      const mockAnnouncements = [
        {
          id: 1,
          mosqueName: 'Central Mosque',
          mosqueId: 'mosque1',
          title: 'Friday Prayer Schedule Update',
          content: 'Due to daylight saving time, Friday prayers will now begin at 1:30 PM instead of 1:00 PM. Please adjust your schedules accordingly.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          type: 'schedule',
          priority: 'high',
          likes: 23,
          comments: 5,
        },
        {
          id: 2,
          mosqueName: 'Masjid Al-Noor',
          mosqueId: 'mosque2',
          title: 'Community Iftar Invitation',
          content: 'Join us for a community iftar this Saturday at 7:00 PM. All families are welcome. Please bring a dish to share.',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          type: 'event',
          priority: 'medium',
          likes: 45,
          comments: 12,
        },
        {
          id: 3,
          mosqueName: 'Islamic Center',
          mosqueId: 'mosque3',
          title: 'Quran Study Circle',
          content: 'Weekly Quran study circle every Wednesday at 7:30 PM. This week we will be discussing Surah Al-Baqarah verses 255-260.',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          type: 'education',
          priority: 'medium',
          likes: 18,
          comments: 3,
        },
        {
          id: 4,
          mosqueName: 'Community Mosque',
          mosqueId: 'mosque4',
          title: 'Mosque Maintenance Notice',
          content: 'The mosque will be closed for maintenance on Sunday from 8:00 AM to 2:00 PM. Regular prayers will resume at Asr time.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          type: 'maintenance',
          priority: 'high',
          likes: 8,
          comments: 1,
        },
      ];

      setAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      Alert.alert('Error', 'Failed to load announcements');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.trim()) {
      Alert.alert('Error', 'Please enter an announcement');
      return;
    }

    try {
      const announcement = {
        id: Date.now(),
        mosqueName: currentUser.mosqueName,
        mosqueId: currentUser.id,
        title: 'New Announcement',
        content: newAnnouncement.trim(),
        timestamp: new Date(),
        type: 'general',
        priority: 'medium',
        likes: 0,
        comments: 0,
      };

      setAnnouncements(prev => [announcement, ...prev]);
      setNewAnnouncement('');
      setShowCreateModal(false);
      
      Alert.alert('Success', 'Announcement posted successfully');
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', 'Failed to post announcement');
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'schedule': return 'schedule';
      case 'event': return 'event';
      case 'education': return 'school';
      case 'maintenance': return 'build';
      default: return 'announcement';
    }
  };

  const getTypeColor = (priority) => {
    switch (priority) {
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#2196F3';
    }
  };

  const renderAnnouncement = (announcement) => (
    <View key={announcement.id} style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.mosqueInfo}>
          <Text style={styles.mosqueName}>{announcement.mosqueName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(announcement.timestamp)}</Text>
        </View>
        <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(announcement.priority) }]}>
          <Icon name={getTypeIcon(announcement.type)} size={16} color="#fff" />
        </View>
      </View>

      <Text style={styles.announcementTitle}>{announcement.title}</Text>
      <Text style={styles.announcementContent}>{announcement.content}</Text>

      <View style={styles.announcementActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="thumb-up" size={16} color="#666" />
          <Text style={styles.actionText}>{announcement.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="comment" size={16} color="#666" />
          <Text style={styles.actionText}>{announcement.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={16} color="#666" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isMosqueAdmin = AuthService.isMosqueAdmin();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>
          {isMosqueAdmin ? 'Manage your mosque announcements' : 'Community updates and news'}
        </Text>
      </View>

      {/* Create Button for Mosque Admins */}
      {isMosqueAdmin && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Icon name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>New Announcement</Text>
        </TouchableOpacity>
      )}

      {/* Announcements List */}
      <ScrollView
        style={styles.announcementsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {announcements.map(renderAnnouncement)}
      </ScrollView>

      {/* Create Announcement Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity onPress={createAnnouncement}>
              <Text style={styles.postButton}>Post</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.announcementInput}
              placeholder="What would you like to announce to your community?"
              multiline
              numberOfLines={8}
              value={newAnnouncement}
              onChangeText={setNewAnnouncement}
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 5,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  announcementsList: {
    flex: 1,
  },
  announcementCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mosqueInfo: {
    flex: 1,
  },
  mosqueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  typeIndicator: {
    padding: 6,
    borderRadius: 15,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  announcementActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  postButton: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  announcementInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
});

export default AnnouncementsScreen;
