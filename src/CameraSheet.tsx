import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradient } from './theme';

export interface Photo {
  uri: string;
  width: number;
  height: number;
}

export interface PageThumb {
  id: number;
  uri: string;
  /** Number of cards found; undefined while the page is being analysed, null when it failed. */
  cards?: number | null;
}

interface CameraSheetProps {
  visible: boolean;
  pages: PageThumb[];
  onPhoto: (photo: Photo) => void;
  onLibrary: () => void;
  onClose: () => void;
}

/** Full-screen camera: shoot a page, turn it, shoot the next one. Each photo is analysed while you keep shooting. */
export function CameraSheet({ visible, pages, onPhoto, onLibrary, onClose }: CameraSheetProps) {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [shooting, setShooting] = useState(false);

  const shoot = async () => {
    setShooting(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.7 });
      if (photo) onPhoto(photo);
    } finally {
      setShooting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => {
        if (!permission?.granted) requestPermission();
      }}>
      <View style={styles.screen}>
        {permission?.granted ? (
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={styles.message}>
            <Text style={styles.messageText}>Allow the camera to photograph your binder pages, or pick photos from your library.</Text>
          </View>
        )}

        <View style={styles.guide} pointerEvents="none">
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View key={corner} style={[styles.corner, styles[corner]]} />
          ))}
        </View>

        <LinearGradient colors={['rgba(0,0,0,0.85)', 'transparent']} style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.round} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.hint}>One page per photo. Turn the page, shoot again.</Text>
        </LinearGradient>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {pages.map((page) => (
              <View key={page.id} style={[styles.thumb, page.cards === null && styles.thumbFailed]}>
                <Image source={{ uri: page.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={[styles.thumbBadge, page.cards === null && { backgroundColor: colors.down }]}>
                  {page.cards === undefined ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={styles.thumbLabel}>{page.cards ?? '!'}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.controls}>
            <Pressable style={styles.round} onPress={onLibrary}>
              <Ionicons name="images" size={22} color={colors.text} />
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shutter, (pressed || shooting) && styles.shutterPressed]} onPress={shoot} disabled={shooting || !permission?.granted}>
              <View style={styles.shutterDisc} />
            </Pressable>
            <Pressable onPress={onClose} disabled={pages.length === 0} style={pages.length === 0 && styles.hidden}>
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.done}>
                <Text style={styles.doneLabel}>Done · {pages.length}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const CORNER = 30;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  messageText: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  guide: { position: 'absolute', left: 28, right: 28, top: '16%', bottom: '27%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 12 },
  tr: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 12 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 12 },
  br: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 12 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 36 },
  hint: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 36, gap: 18 },
  thumbs: { paddingHorizontal: 16, gap: 10, minHeight: 66 },
  thumb: { width: 48, height: 66, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  thumbFailed: { borderColor: colors.down },
  thumbBadge: { position: 'absolute', right: 3, bottom: 3, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentAlt },
  thumbLabel: { color: colors.onAccent, fontSize: 12, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { transform: [{ scale: 0.94 }], opacity: 0.7 },
  shutterDisc: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  done: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 999 },
  doneLabel: { color: colors.onAccent, fontSize: 15, fontWeight: '800' },
  hidden: { opacity: 0 },
});
