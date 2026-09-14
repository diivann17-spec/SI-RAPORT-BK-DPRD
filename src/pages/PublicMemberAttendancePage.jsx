import React from 'react';
import PublicAttendancePage from './PublicAttendancePage';

export default function PublicMemberAttendancePage(props) {
  return <PublicAttendancePage {...props} pageType="MEMBER" memberOnly />;
}
