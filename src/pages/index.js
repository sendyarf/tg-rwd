import { useEffect, useState } from 'react';
import { useNhostClient } from '@nhost/react';
import nhost from '../lib/nhost';

export default function Home() {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [error, setError] = useState(null);
  const nhostClient = useNhostClient();

  // Log initial render
  console.log('Component rendered at', new Date().toISOString());

  // Load Monetag script
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Checking Monetag SDK...');
      if (window.show_9244919) {
        console.log('Monetag SDK already loaded');
        return;
      }
      console.log('Loading Monetag SDK...');
      const tag = document.createElement('script');
      tag.src = '//whephiwums.com/sdk.js';
      tag.dataset.zone = '9244919';
      tag.dataset.sdk = 'show_9244919';
      tag.onerror = () => {
        console.error('Failed to load Monetag SDK');
        setError('Failed to load ad service.');
      };
      tag.onload = () => console.log('Monetag SDK loaded successfully');
      document.body.appendChild(tag);
    } else {
      console.error('Window is undefined for Monetag');
    }
  }, []);

  // Telegram initialization
  useEffect(() => {
    console.log('Starting Telegram initialization at', new Date().toISOString());
    const timeout = setTimeout(() => {
      if (!user && !error) {
        console.error('Initialization timeout after 10 seconds');
        setError('Failed to initialize Telegram Web App. Please try again.');
      }
    }, 10000);

    if (typeof window !== 'undefined') {
      console.log('Window defined, checking Telegram WebApp...');
      if (window.Telegram?.WebApp) {
        console.log('Telegram WebApp found, version:', window.Telegram.WebApp.version);
        window.Telegram.WebApp.ready();
        const initData = window.Telegram.WebApp.initDataUnsafe;
        console.log('initData:', initData);
        if (initData?.user) {
          console.log('User found, logging in:', initData.user);
          loginWithTelegram(initData.user);
        } else {
          console.error('No user data in initData');
          setError('No user data available from Telegram.');
        }
      } else {
        console.error('Telegram WebApp SDK not found');
        setError('Telegram Web App SDK not loaded. Please check your connection.');
      }
    } else {
      console.error('Window is undefined');
      setError('Browser environment not detected.');
    }

    return () => clearTimeout(timeout);
  }, []);

  const loginWithTelegram = async (telegramUser) => {
    try {
      console.log('Sending GraphQL mutation to Nhost...');
      const { data, error } = await nhostClient.graphql.request(`
        mutation {
          insert_telegram_users_one(
            object: { telegram_id: "${telegramUser.id}", display_name: "${telegramUser.first_name}" }
            on_conflict: { constraint: telegram_users_telegram_id_key, update_columns: [display_name] }
          ) {
            id
          }
        }
      `);
      if (error) {
        console.error('GraphQL mutation error:', error);
        throw new Error(error.message);
      }

      const userId = data.insert_telegram_users_one.id;
      console.log('User inserted, ID:', userId);
      setUser({ id: userId, display_name: telegramUser.first_name });

      console.log('Fetching points...');
      const pointsData = await nhostClient.graphql.request(`
        query {
          points(where: { user_id: { _eq: "${userId}" } }) {
            points
          }
        }
      `);
      if (pointsData.data.points.length > 0) {
        console.log('Points found:', pointsData.data.points[0].points);
        setPoints(pointsData.data.points[0].points);
      } else {
        console.log('No points found, inserting initial points...');
        await nhostClient.graphql.request(`
          mutation {
            insert_points_one(object: { user_id: "${userId}", points: 0 }) {
              points
            }
          }
        `);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError(`Failed to connect to server: ${error.message}`);
    }
  };

  const watchAd = async () => {
    console.log('Attempting to show Monetag ad...');
    if (typeof window !== 'undefined' && window.show_9244919) {
      try {
        console.log('Calling show_9244919...');
        await window.show_9244919();
        console.log('Ad shown successfully');
        const { data, error } = await nhostClient.graphql.request(`
          mutation {
            update_points(
              where: { user_id: { _eq: "${user.id}" } }
              _inc: { points: 1 }
            ) {
              returning {
                points
              }
            }
          }
        `);
        if (error) {
          console.error('GraphQL update points error:', error);
          throw new Error(error.message);
        }
        console.log('Points updated:', data.update_points.returning[0].points);
        setPoints(data.update_points.returning[0].points);
        alert('You have seen an ad! +1 Point');
      } catch (error) {
        console.error('Error showing ad or updating points:', error);
        setError('Failed to show ad or update points.');
      }
    } else {
      console.error('Monetag SDK not loaded');
      alert('Ad service not available. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : user ? (
        <>
          <h1 className="text-2xl font-bold mb-4">Selamat datang, {user.display_name}!</h1>
          <p className="text-lg mb-4">Poin Anda: {points}</p>
          <button
            onClick={watchAd}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Tonton Iklan (+1 Poin)
          </button>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}