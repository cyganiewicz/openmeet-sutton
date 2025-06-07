import React from 'react';
import MeetingList from './components/MeetingList';
import meetings from './data/meetings.json';

function App() {
  return (
    <div>
      <h1>OpenMeet Sutton</h1>
      <MeetingList meetings={meetings} />
    </div>
  );
}
export default App;