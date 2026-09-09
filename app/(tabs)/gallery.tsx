import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useMediaLibrary, MediaItem } from '@/hooks/useMediaLibrary';
import { Colors, Spacing, FontSize, Radius, GlassShadow } from '@/constants/theme';
import { buildWatermarkLines } from '@/services/gpsWatermark';

const { width } = Dimensions.get('window');
const COLS = 3;
const SPACING = Spacing.md * 2 + Spacing.xs * (COLS - 1);
const THUMB_SIZE = Math.floor((width - SPACING) / COLS);
const LIST_ITEM_HEIGHT = 90;

type FilterType = 'all' | 'photo' | 'video' | 'gps' | 'loop';
type SortType = 'newest' | 'oldest' | 'type';
type ViewMode = 'grid' | 'list';

const FILTER_OPTS: { value: FilterType; label: string; icon: any }[] = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'photo', label: 'Photos', icon: 'photo-camera' },
  { value: 'video', label: 'Videos', icon: 'videocam' },
  { value: 'gps', label: 'GPS', icon: 'location-on' },
  { value: 'loop', label: 'Dashcam', icon: 'loop' },
];

function SkeletonThumb() {
  return <View style={[skStyles.skThumb, { width: THUMB_SIZE, height: THUMB_SIZE }]} />;
}

// ── Video player component (isolated so hook works per-modal open) ─────────────
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.previewImg}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mediaItems, loadRecentMedia, hasPermission, requestPermission, deleteMedia } = useMediaLibrary();

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sharing, setSharing] = useState(false);
  const [longPressed, setLongPressed] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!hasPermission) await requestPermission();
    await loadRecentMedia();
    setLoading(false);
  }, [hasPermission, loadRecentMedia, requestPermission]);

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const base = mediaItems.filter((m) => {
      if (filter === 'photo') return m.type === 'photo';
      if (filter === 'video') return m.type === 'video';
      if (filter === 'gps') return !!m.gps;
      if (filter === 'loop') return m.loopSegment !== undefined;
      return true;
    });
    return base.slice().sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt;
      if (sort === 'oldest') return a.createdAt - b.createdAt;
      if (sort === 'type') return a.type.localeCompare(b.type);
      return 0;
    });
  }, [mediaItems, filter, sort]);

  const photos = useMemo(() => mediaItems.filter((m) => m.type === 'photo').length, [mediaItems]);
  const videos = useMemo(() => mediaItems.filter((m) => m.type === 'video').length, [mediaItems]);
  const gpsTagged = useMemo(() => mediaItems.filter((m) => m.gps).length, [mediaItems]);

  const handleShare = useCallback(async (item: MediaItem) => {
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) { Alert.alert('Not available', 'Sharing not supported on this device.'); return; }
      let uri = item.uri;
      if (item.uri.startsWith('file://')) {
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const dest = `${FileSystem.cacheDirectory}share_${item.id}.${ext}`;
        await FileSystem.copyAsync({ from: item.uri, to: dest });
        uri = dest;
      }
      await Sharing.shareAsync(uri, {
        mimeType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
        dialogTitle: `Share ${item.type}`,
        UTI: item.type === 'video' ? 'public.movie' : 'public.jpeg',
      });
    } catch { Alert.alert('Error', 'Share failed.'); }
    finally { setSharing(false); }
  }, []);

  const handleDelete = useCallback((item: MediaItem) => {
    Alert.alert('Delete', `Delete this ${item.type}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteMedia(item.id);
          if (selected?.id === item.id) setSelected(null);
          setLongPressed(null);
        }
      },
    ]);
  }, [deleteMedia, selected]);

  const getGridItemLayout = useCallback(
    (_: any, index: number) => {
      const row = Math.floor(index / COLS);
      return { length: THUMB_SIZE + Spacing.xs, offset: row * (THUMB_SIZE + Spacing.xs), index };
    }, []
  );

  const getListItemLayout = useCallback(
    (_: any, index: number) => ({
      length: LIST_ITEM_HEIGHT + Spacing.sm,
      offset: index * (LIST_ITEM_HEIGHT + Spacing.sm),
      index,
    }), []
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  const renderGridItem = useCallback(({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.gridThumb}
      onPress={() => setSelected(item)}
      onLongPress={() => setLongPressed(item)}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.gridImg}
        contentFit="cover"
        transition={150}
        recyclingKey={item.id}
        cachePolicy="memory-disk"
      />
      {item.type === 'video' && (
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gridGrad}>
          <MaterialIcons name="play-circle-fill" size={24} color="#fff" />
          {item.duration ? <Text style={styles.gridDur}>{Math.round(item.duration)}s</Text> : null}
        </LinearGradient>
      )}
      {item.gps && (
        <View style={styles.gridGpsBadge}>
          <MaterialIcons name="location-on" size={9} color={Colors.gpsGreen} />
        </View>
      )}
      {item.loopSegment !== undefined && (
        <View style={styles.gridLoopBadge}>
          <MaterialIcons name="loop" size={9} color={Colors.recording} />
        </View>
      )}
    </TouchableOpacity>
  ), []);

  const renderListItem = useCallback(({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => setSelected(item)}
      onLongPress={() => setLongPressed(item)}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      <View style={styles.listThumbWrap}>
        <Image
          source={{ uri: item.uri }}
          style={styles.listThumb}
          contentFit="cover"
          transition={150}
          recyclingKey={item.id}
          cachePolicy="memory-disk"
        />
        {item.type === 'video' && (
          <View style={styles.listPlayBadge}>
            <MaterialIcons name="play-arrow" size={12} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.listInfo}>
        <View style={styles.listTopRow}>
          <View style={[styles.listTypeBadge, item.type === 'video' ? styles.videoBadgeColor : styles.photoBadgeColor]}>
            <MaterialIcons name={item.type === 'video' ? 'videocam' : 'camera-alt'} size={10} color="#fff" />
            <Text style={styles.listTypeTxt}>{item.type.toUpperCase()}</Text>
          </View>
          {item.resolution && <Text style={styles.listRes}>{item.resolution}</Text>}
        </View>
        <Text style={styles.listFilename} numberOfLines={1}>{item.filename}</Text>
        {item.gps && (
          <Text style={styles.listCoord}>
            {`${Math.abs(item.gps.latitude).toFixed(5)}° ${item.gps.latitude >= 0 ? 'N' : 'S'}  ${Math.abs(item.gps.longitude).toFixed(5)}° ${item.gps.longitude >= 0 ? 'E' : 'W'}`}
          </Text>
        )}
        <Text style={styles.listDate}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <TouchableOpacity onPress={() => handleShare(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="share" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleShare]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#ffffff', Colors.gradEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <Text style={styles.headerTitle}>GALLERY</Text>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <MaterialIcons name="camera-alt" size={10} color={Colors.primary} />
              <Text style={styles.statTxt}>{photos}</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialIcons name="videocam" size={10} color={Colors.recording} />
              <Text style={styles.statTxt}>{videos}</Text>
            </View>
            <View style={styles.statChip}>
              <MaterialIcons name="location-on" size={10} color={Colors.gpsGreen} />
              <Text style={styles.statTxt}>{gpsTagged} GPS</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerBtns}>
          {/* GPS Track visualization */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: Colors.primaryDim }]}
            onPress={() => router.push('/track')}
          >
            <MaterialIcons name="map" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
          >
            <MaterialIcons name={viewMode === 'grid' ? 'view-list' : 'grid-view'} size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSort((s) => s === 'newest' ? 'oldest' : s === 'oldest' ? 'type' : 'newest')}
          >
            <MaterialIcons name="sort" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={load}>
            <MaterialIcons name="refresh" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Filter bar ── */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {FILTER_OPTS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <MaterialIcons name={f.icon} size={12} color={filter === f.value ? '#fff' : Colors.textMuted} />
              <Text style={[styles.filterTxt, filter === f.value && styles.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sortBadge}>
          <MaterialIcons name="swap-vert" size={12} color={Colors.textMuted} />
          <Text style={styles.sortTxt}>{sort}</Text>
        </View>
      </View>

      {/* ── Count strip ── */}
      <View style={styles.countStrip}>
        <Text style={styles.countTxt}>{filtered.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 12 }).map((_, i) => <SkeletonThumb key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="photo-library" size={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Media Found</Text>
          <Text style={styles.emptySub}>Capture photos or videos from the Camera tab.</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filtered}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={COLS}
          getItemLayout={getGridItemLayout}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
          columnWrapperStyle={styles.gridRow}
          maxToRenderPerBatch={12}
          windowSize={5}
          initialNumToRender={12}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <FlatList
          key="list"
          data={filtered}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          numColumns={1}
          getItemLayout={getListItemLayout}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={8}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* ── Long-press context menu ── */}
      <Modal visible={longPressed !== null} animationType="fade" transparent>
        <TouchableOpacity style={styles.ctxOverlay} activeOpacity={1} onPress={() => setLongPressed(null)}>
          <View style={styles.ctxMenu}>
            <Text style={styles.ctxFilename} numberOfLines={1}>{longPressed?.filename}</Text>
            {longPressed?.gps && (
              <View style={styles.ctxGps}>
                <MaterialIcons name="location-on" size={12} color={Colors.gpsGreen} />
                <Text style={styles.ctxGpsTxt}>
                  {`${Math.abs(longPressed.gps.latitude).toFixed(5)}° ${longPressed.gps.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longPressed.gps.longitude).toFixed(5)}° ${longPressed.gps.longitude >= 0 ? 'E' : 'W'}`}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.ctxItem} onPress={() => { const i = longPressed!; setLongPressed(null); handleShare(i); }}>
              <View style={[styles.ctxItemIcon, { backgroundColor: Colors.primaryDim }]}>
                <MaterialIcons name="share" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.ctxItemTxt}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctxItem} onPress={() => { const i = longPressed!; setLongPressed(null); setSelected(i); }}>
              <View style={[styles.ctxItemIcon, { backgroundColor: Colors.gpsGreenDim }]}>
                <MaterialIcons name="open-in-full" size={18} color={Colors.gpsGreen} />
              </View>
              <Text style={styles.ctxItemTxt}>View Full</Text>
            </TouchableOpacity>
            {longPressed?.gps && (
              <TouchableOpacity
                style={styles.ctxItem}
                onPress={() => { setLongPressed(null); router.push('/track'); }}
              >
                <View style={[styles.ctxItemIcon, { backgroundColor: Colors.primaryDim }]}>
                  <MaterialIcons name="map" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.ctxItemTxt}>View on Map</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.ctxItem} onPress={() => handleDelete(longPressed!)}>
              <View style={[styles.ctxItemIcon, { backgroundColor: Colors.recordingDim }]}>
                <MaterialIcons name="delete-outline" size={18} color={Colors.recording} />
              </View>
              <Text style={[styles.ctxItemTxt, { color: Colors.recording }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Preview modal (photo or video) ── */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.previewBg}>
          <LinearGradient
            colors={['rgba(240,245,255,0.99)', 'rgba(220,232,255,0.99)']}
            style={styles.previewSheet}
          >
            {/* Top bar */}
            <View style={styles.previewTopBar}>
              <TouchableOpacity style={styles.previewIconBtn} onPress={() => setSelected(null)}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.previewTopTitle}>
                {selected?.type === 'video' ? 'VIDEO' : 'PHOTO'}
              </Text>
              <TouchableOpacity
                style={[styles.previewIconBtn, styles.shareIconBtn]}
                onPress={() => selected && handleShare(selected)}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <MaterialIcons name="share" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Media preview */}
            {selected ? (
              <View style={styles.previewImgWrap}>
                {selected.type === 'video' ? (
                  <VideoPreview uri={selected.uri} />
                ) : (
                  <Image
                    source={{ uri: selected.uri }}
                    style={styles.previewImg}
                    contentFit="contain"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                )}
                {/* GPS watermark overlay */}
                {selected.gps && selected.type === 'photo' && (
                  <View style={styles.previewWatermark} pointerEvents="none">
                    {buildWatermarkLines({
                      latitude: selected.gps.latitude,
                      longitude: selected.gps.longitude,
                      altitude: selected.gps.altitude,
                      accuracy: selected.gps.accuracy,
                      speed: selected.gps.speed,
                      resolution: selected.resolution ?? '---',
                      timestamp: new Date(selected.createdAt),
                    }).map((line, i) => (
                      <Text key={i} style={styles.watermarkLine}>{line}</Text>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Meta info */}
            {selected ? (
              <View style={styles.previewMeta}>
                <View style={styles.previewMetaRow}>
                  <View style={styles.previewMetaCard}>
                    <MaterialIcons name={selected.type === 'video' ? 'videocam' : 'camera-alt'} size={14} color={Colors.primary} />
                    <Text style={styles.previewMetaLabel}>Type</Text>
                    <Text style={styles.previewMetaVal}>{selected.type.toUpperCase()}</Text>
                  </View>
                  {selected.resolution && (
                    <View style={styles.previewMetaCard}>
                      <MaterialIcons name="hd" size={14} color={Colors.primary} />
                      <Text style={styles.previewMetaLabel}>Quality</Text>
                      <Text style={styles.previewMetaVal}>{selected.resolution}</Text>
                    </View>
                  )}
                  {selected.duration ? (
                    <View style={styles.previewMetaCard}>
                      <MaterialIcons name="timer" size={14} color={Colors.primary} />
                      <Text style={styles.previewMetaLabel}>Duration</Text>
                      <Text style={styles.previewMetaVal}>{Math.round(selected.duration)}s</Text>
                    </View>
                  ) : null}
                </View>

                {selected.gps && (
                  <View style={styles.previewGpsCard}>
                    <View style={styles.previewGpsRow}>
                      <MaterialIcons name="location-on" size={14} color={Colors.gpsGreen} />
                      <Text style={styles.previewGpsTitle}>GPS Location</Text>
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => { setSelected(null); router.push('/track'); }}
                      >
                        <MaterialIcons name="map" size={12} color={Colors.primary} />
                        <Text style={styles.trackBtnTxt}>View on Map</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.previewCoord}>
                      {`${Math.abs(selected.gps.latitude).toFixed(6)}° ${selected.gps.latitude >= 0 ? 'N' : 'S'}`}
                    </Text>
                    <Text style={styles.previewCoord}>
                      {`${Math.abs(selected.gps.longitude).toFixed(6)}° ${selected.gps.longitude >= 0 ? 'E' : 'W'}`}
                    </Text>
                    {selected.gps.altitude != null && (
                      <Text style={styles.previewCoordSub}>Alt: {selected.gps.altitude.toFixed(1)} m</Text>
                    )}
                    {selected.gps.speed != null && (
                      <Text style={styles.previewCoordSub}>Speed: {(selected.gps.speed * 3.6).toFixed(1)} km/h</Text>
                    )}
                  </View>
                )}

                <Text style={styles.previewFilename} numberOfLines={1}>{selected.filename}</Text>
                <Text style={styles.previewDate}>{new Date(selected.createdAt).toLocaleString()}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const skStyles = StyleSheet.create({
  skThumb: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceBorder,
    margin: Spacing.xs / 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  skeletonGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: Spacing.md, gap: Spacing.xs,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    ...GlassShadow, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4,
  },
  headerTitle: {
    color: Colors.textPrimary, fontSize: FontSize.xl,
    fontWeight: '900', letterSpacing: 2.5,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primaryDim,
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full,
  },
  statTxt: { color: Colors.primary, fontSize: 9, fontWeight: '700' },
  headerBtns: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...GlassShadow, shadowRadius: 4, elevation: 2,
  },

  filterWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingLeft: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  filterBar: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTxt: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  filterTxtActive: { color: '#fff' },
  sortBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderLeftWidth: 1, borderLeftColor: Colors.surfaceBorder,
    marginLeft: Spacing.xs,
  },
  sortTxt: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },

  countStrip: { paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.background },
  countTxt: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIcon: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: Colors.primaryDim,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.xs },
  emptySub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

  gridContent: { padding: Spacing.md, paddingTop: Spacing.sm },
  gridRow: { gap: Spacing.xs, marginBottom: Spacing.xs },
  gridThumb: {
    width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: Radius.md, overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
    ...GlassShadow, shadowRadius: 4, elevation: 2,
  },
  gridImg: { width: '100%', height: '100%' },
  gridGrad: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', alignItems: 'flex-start',
    padding: 6, flexDirection: 'row', alignContent: 'space-between',
  },
  gridDur: { color: '#fff', fontSize: 9, fontWeight: '700', marginLeft: 3 },
  gridGpsBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: 2,
  },
  gridLoopBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4, padding: 2,
  },

  listContent: { padding: Spacing.md, gap: Spacing.sm },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.sm, gap: Spacing.sm, height: LIST_ITEM_HEIGHT,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...GlassShadow, shadowRadius: 6, elevation: 2,
  },
  listThumbWrap: { position: 'relative' },
  listThumb: {
    width: 64, height: 64, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceBorder,
  },
  listPlayBadge: {
    position: 'absolute', inset: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.md,
  },
  listInfo: { flex: 1 },
  listTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  listTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 2, paddingHorizontal: 6, borderRadius: Radius.full,
  },
  photoBadgeColor: { backgroundColor: Colors.primary },
  videoBadgeColor: { backgroundColor: Colors.recording },
  listTypeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  listRes: { color: Colors.textMuted, fontSize: 9, fontWeight: '600' },
  listFilename: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
  listCoord: { color: Colors.gpsGreen, fontSize: 9, fontFamily: 'monospace' as any, marginBottom: 1 },
  listDate: { color: Colors.textMuted, fontSize: 9 },

  ctxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ctxMenu: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: Spacing.xxl,
    ...GlassShadow, elevation: 20,
  },
  ctxFilename: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  ctxGps: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  ctxGpsTxt: { color: Colors.gpsGreen, fontSize: FontSize.xs, fontFamily: 'monospace' as any },
  ctxItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, gap: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  ctxItemIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  ctxItemTxt: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },

  previewBg: { flex: 1, backgroundColor: 'rgba(0,20,60,0.5)', justifyContent: 'flex-end' },
  previewSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', maxHeight: '94%',
  },
  previewTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  previewIconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  shareIconBtn: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  previewTopTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', letterSpacing: 1 },
  previewImgWrap: {
    width: width, height: width, backgroundColor: '#e8eeff', position: 'relative',
  },
  previewImg: { width: '100%', height: '100%' },
  previewWatermark: {
    position: 'absolute', bottom: Spacing.sm, left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.sm, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: 'rgba(0,184,108,0.4)',
  },
  watermarkLine: {
    color: Colors.gpsGreen, fontSize: 10,
    fontFamily: 'monospace' as any, lineHeight: 16,
  },
  previewMeta: { padding: Spacing.md, gap: Spacing.sm },
  previewMetaRow: { flexDirection: 'row', gap: Spacing.sm },
  previewMetaCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', borderWidth: 1,
    borderColor: Colors.surfaceBorder, gap: 2,
  },
  previewMetaLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  previewMetaVal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '800' },
  previewGpsCard: {
    backgroundColor: Colors.gpsGreenDim, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1,
    borderColor: 'rgba(0,184,108,0.25)', gap: 3,
  },
  previewGpsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 4,
  },
  previewGpsTitle: { flex: 1, color: Colors.gpsGreen, fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 0.5 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryDim,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(0,87,231,0.2)',
  },
  trackBtnTxt: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  previewCoord: {
    color: Colors.textPrimary, fontSize: FontSize.sm,
    fontFamily: 'monospace' as any, fontWeight: '600',
  },
  previewCoordSub: { color: Colors.textSecondary, fontSize: FontSize.xs, fontFamily: 'monospace' as any },
  previewFilename: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.xs },
  previewDate: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: 'monospace' as any },
});
