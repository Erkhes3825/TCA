import { useEffect, useState } from 'react';
import PatientFlow from './screens/patient/PatientFlow';
import Compare from './screens/Compare';
import Clinician from './screens/Clinician';
import DemoNav from './components/DemoNav';

/** ハッシュルーティング（依存ライブラリなし）。#/ 患者 / #/compare 比較 / #/clinician 医療者 */
function useHashRoute(): string {
  // '#compare' のような / なしの形も受け付ける（Claude アーティファクトの URL では / 付きのハッシュを直接渡せないため）
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return '/' + h;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  return (
    <>
      <DemoNav route={route} />
      {route === '/compare' ? <Compare /> : route === '/clinician' ? <Clinician /> : <PatientFlow />}
    </>
  );
}
