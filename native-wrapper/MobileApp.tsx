
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  BackHandler,
  Platform,
  View,
  ActivityIndicator,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';

// URL của Web App (Thay thế bằng URL deploy thực tế của bạn, ví dụ Firebase Hosting)
const WEB_APP_URL = 'https://army-hrm-70615.web.app'; 

const MobileApp = () => {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- 3. XỬ LÝ NÚT BACK VẬT LÝ TRÊN ANDROID ---
  const handleBackButton = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true; // Chặn hành động thoát app mặc định
    }
    // Nếu không còn lịch sử để back, cho phép thoát app (hoặc hiện dialog xác nhận)
    return false; 
  }, [canGoBack]);

  useEffect(() => {
    // Đăng ký sự kiện BackHandler chỉ trên Android
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackButton);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      };
    }
  }, [handleBackButton]);

  // --- CẤU HÌNH WEBVIEW ---
  // onNavigationStateChange: Cập nhật trạng thái nav để biết có back được không
  const onNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  return (
    <View style={styles.container}>
      {/* --- 2. CẤU HÌNH STATUS BAR --- */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff" // Màu trùng với Web App Header
        translucent={false} // Không để nội dung đè lên status bar
      />
      
      {/* SafeAreaView đảm bảo hiển thị tốt trên iPhone tai thỏ */}
      <SafeAreaView style={styles.safeArea}>
        <WebView
          ref={webViewRef}
          source={{ uri: WEB_APP_URL }}
          style={styles.webview}
          
          // --- 4. TÍNH NĂNG BỔ SUNG ---
          javaScriptEnabled={true}
          domStorageEnabled={true}

          // Cấp quyền media/location và tối ưu playback
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          geolocationEnabled={true}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          originWhitelist={['*']}
          
          // --- 3. XỬ LÝ BÀN PHÍM TRÊN IOS (Input Accessory Bar) ---
          // Ẩn thanh công cụ (mũi tên, nút Done) phía trên bàn phím iOS
          hideKeyboardAccessoryView={true}
          
          // Cho phép cử chỉ vuốt để back trên iOS
          allowsBackForwardNavigationGestures={true}
          
          // Xử lý trạng thái điều hướng
          onNavigationStateChange={onNavigationStateChange}
          
          // Tối ưu hóa hiển thị
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#059669" />
            </View>
          )}
          
          // Xử lý các link ngoài (như gọi điện, gửi mail)
          onShouldStartLoadWithRequest={(request) => {
             // Cho phép các link tel:, mailto: chạy qua Linking của hệ điều hành
             if (request.url.startsWith('tel:') || request.url.startsWith('mailto:')) {
                 Linking.openURL(request.url);
                 return false;
             }
             return true;
          }}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Màu nền khớp với Web App
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  }
});

export default MobileApp;
