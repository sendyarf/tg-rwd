import { useEffect, useState } from 'react';
import { useNhostClient } from '@nhost/react';
import nhost from '../lib/nhost';

export default function Home() {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const nhostClient = useNhostClient();

  // Load Monetag script
  useEffect(() => {
    if (typeof window !== 'undefined' && window.show_9244919) {
      return;
    }
    const tag = document.createElement('script');
    tag.src = '//whephiwums.com/sdk.js';
    tag.dataset.zone = '9244919';
    tag.dataset.sdk = 'show_9244919';
    document.body.appendChild(tag);
  }, []);

  // Telegram initialization
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      const initData = window.Telegram.WebApp.initDataUnsafe;
      if (initData.user) {
        loginWithTelegram(initData.user);
      }
    }
  }, []);

  const loginWithTelegram = async (telegramUser) => {
    try {
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
      if (error) throw error;

      const userId = data.insert_telegram_users_one.id;
      setUser({ id: userId, display_name: telegramUser.first_name });

      const pointsData = await nhostClient.graphql.request(`
        query {
          points(where: { user_id: { _eq: "${userId}" } }) {
            points
          }
        }
      `);
      if (pointsData.data.points.length > 0) {
        setPoints(pointsData.data.points[0].points);
      } else {
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
    }
  };

  const watchAd = async () => {
    if (typeof window !== 'undefined' && window.show_9244919) {
      try {
        await window.show_9244919();
        // Ad watched successfully, update points
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
        if (error) throw error;
        setPoints(data.update_points.returning[0].points);
        alert('You have seen an ad! +1 Point');
      } catch (error) {
        console.error('Error showing ad or updating points:', error);
      }
    } else {
      console.error('Monetag SDK not loaded');
      alert('Ad service not available. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      {user ? (
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