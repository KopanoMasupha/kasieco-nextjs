import React, { useEffect, useState } from "react";
export default function dynamic(loader: () => Promise<any>, opts?: { loading?: () => any }) {
  let Cached: any = null;
  return function Dyn(props: any) {
    const [C, setC] = useState<any>(() => Cached);
    useEffect(() => { if (!C) loader().then((m) => { Cached = m.default || m; setC(() => Cached); }); }, []);
    return C ? <C {...props} /> : opts?.loading ? opts.loading() : null;
  };
}
