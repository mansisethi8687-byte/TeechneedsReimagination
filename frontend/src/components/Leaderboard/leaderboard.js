'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '../../lib/api';
import './leaderboard.css';

export default function Leaderboard() {
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard(50);
        setMentees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
        setError('Could not load leaderboard from the local API.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="load-wrapp">
        <div className="load-4">
          <div className="ring-1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h1>🏆 Mentee Leaderboard</h1>
      {error && <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>}
      <div className="responsive-table-wrapper">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Total Score</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {mentees.map((mentee, index) => (
              <tr key={index}>
                <td>#{mentee.rank}</td>
                <td>{mentee.name}</td>
                <td>{mentee.totalScore}</td>
                <td>🔥 {mentee.streak} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
