import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const MeetingList = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, date, description, committee_id')
        .order('date', { ascending: false });

      if (!error) {
        setMeetings(data);
      } else {
        console.error(error);
      }
      setLoading(false);
    };

    fetchMeetings();
  }, []);

  if (loading) return <p>Loading meetings...</p>;

  return (
    <div>
      {meetings.map((meeting) => (
        <div key={meeting.id}>
          <h2>{meeting.date}</h2>
          <p>{meeting.description}</p>
        </div>
      ))}
    </div>
  );
};

export default MeetingList;
