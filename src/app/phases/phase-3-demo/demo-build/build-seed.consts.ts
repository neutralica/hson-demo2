export const DEFAULT_SEED = `
<div id="build-demo" style="
  background: #02070d;
  border-left: 1px solid rgba(120,180,255,0.28);
  border-right: 1px solid rgba(120,180,255,0.12);
  box-sizing: border-box; color: white; display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  padding: 28px 34px 26px 34px; 
  height: 100%;
  width: 100%
"
  <div style="
    display: flex;
    align-items: flex-start;
    justify-content: space-between
  "
    <div style="
      background: rgba(160,220,255,0.35); 
      height: 1px; 
      margin-top: 22px; 
      width: 120px
    "/>
    <h1 id="build-heading" style="
      color: rgba(175,220,255,0.96); 
      font-family: monospace; 
      font-size: 1.95rem; 
      font-weight: 700; 
      letter-spacing: 0.16em; 
      margin: 0; 
      text-align: center
    "
      "HSON BUILD DEMO"
    />
    <div style="
      background: rgba(160,220,255,0.35); 
      height: 1px; 
      margin-top: 22px; 
      width: 120px
    "/>
  />
  <div style="
    display: flex; 
    justify-content: center; 
    margin-top: 10px
  "
    <div style="
      color: rgba(255,180,40,0.96); 
      font-family: monospace; 
      font-size: 1rem; 
      letter-spacing: 0.08em; 
      text-align: center
    "
      "<- edit the HSON string"
    />
  />
  <div style="
    display: grid; 
    padding: 30px 0 24px 0; 
    place-items: center
  "
    <div style="
      align-items: center; 
      column-gap: 26px; 
      display: grid; 
      grid-template-columns: 1fr auto 1fr; 
      max-width: 980px; 
      width: 100%
    "
      <div style="
        background: linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.32)); 
        height: 1px
      "/>
      <div style="
        background-color: dodgerblue; 
        border: 12px solid navy; 
        box-sizing: border-box; 
        height: 300px; 
        position: relative; 
        width: 300px
      "
        <div style="
          display: grid; 
          inset: 0; 
          place-items: 
          center; position:
          absolute
        "
          <div style="
            color: navy; 
            font-family: Comic Sans MS; 
            font-size: 52px; 
            letter-spacing: -0.04em; 
            line-height: 0.6; 
            text-align: left
          "
            <div "hs"/>
            <div "on"/>
          />
        />
        <div style="
          background: rgba(189,171,92,1);
          border-radius: 999px;
          bottom: 5px; 
          color: navy; 
          display: grid; 
          font-family: monospace; 
          font-size: 26px; 
          height: 60px; 
          left: 5px; 
          place-items: 
          center; 
          position: absolute; 
          transform: rotate(90deg); 
          width: 60px
        "
          ":)"
        />
      />
      <div style="
        background: linear-gradient(90deg,rgba(255,255,255,0.32),rgba(255,255,255,0)); 
        height: 1px
      "/>
    />
  />
  <div style="
    background: linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.22),rgba(255,255,255,0)); 
    height: 1px
  "/>
  <div style="
    display: flex; 
    justify-content: center; 
    padding-top: 18px
  "
    <div style="
      color: rgba(255,180,40,0.96); 
      font-family: monospace; 
      font-size: 1rem; 
      letter-spacing: 0.08em; 
      text-align: center
    "
      "^ changes rendered synchronously"
    />
  />

/>
`;
