import React from 'react';
import PublicAttendancePage from './PublicAttendancePage';

export default function PublicOpdAttendancePage(props) {
  return <PublicAttendancePage {...props} pageType="OPD" publicGuest />;
}
