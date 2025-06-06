import React from 'react';

const MeetingList = ({ meetings }) => (
  <div>
    {meetings.map((meeting, index) => (
      <div key={index}>
        <h2>{meeting.committee} - {meeting.date}</h2>
        <p>{meeting.description}</p>
        {meeting.documents.map((doc, i) => (
          <div key={i}><a href={doc.url} target="_blank" rel="noreferrer">{doc.type}</a></div>
        ))}
      </div>
    ))}
  </div>
);

export default MeetingList;