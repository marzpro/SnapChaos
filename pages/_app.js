import '../styles/globals.css';
import SocketProvider from '../components/SocketProvider';

export default function MyApp({ Component, pageProps }) {
  return (
    <SocketProvider>
      <Component {...pageProps} />
    </SocketProvider>
  );
}