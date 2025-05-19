import React, { useEffect, useRef, memo } from 'react';

function TradingViewMiniWidget({ symbol }) {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "symbol": "${symbol}",
        "width": "100%",
        "height": 250,
        "locale": "en",
        "dateRange": "12M",
        "colorTheme": "dark",
        "isTransparent": false,
        "autosize": true,
        "largeChartUrl": null,
        "showChart": false,
        "showVolume": false,
        "showIntervalTabs": false,
        "showSymbolLogo": true,
        "showFloatingTooltip": false,
        "hideTopToolbar": true,
        "hideSideToolbar": true,
        "allowSymbolChange": false,
        "saveImage": false,
        "hideideas": true
      }`;
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div style={{ pointerEvents: 'none' }}>
      <div className="tradingview-widget-container w-full" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
}

export default memo(TradingViewMiniWidget); 