import React, { useEffect, useRef } from 'react';
import './App.css';
import './litegraph.css';
import { LGraph, LGraphCanvas, LiteGraph } from './lib/litegraph/litegraph.core.js';
import createSatisfactoryNodes, { createPipeline, ingredientGraph, itemFromName } from './lib/satisfactory/satisfactory';

const speed_ms = 1000

function saveLocalStorage(graph: any) {
  console.log("-- saving graph to local storage")
  localStorage.setItem('graph', JSON.stringify(graph.serialize()))
}

function loadLocalStorage(graph: any) {
  console.log("-- loading graph from local storage")
  const data = localStorage.getItem('graph')
  if (data) {
    graph.configure(JSON.parse(data))
  }
}

function clearGraph(graph: any) {
  console.log('-- clearing graph')
  if (graph) {
    graph.stop()
    graph.configure(JSON.parse('{}'))
    graph.start(speed_ms)
  }
}

function saveFile(graph: any) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graph.serialize()))
  return dataStr
}

function App() {
  const graphContainerRef = useRef<HTMLCanvasElement>(null!)
  let graph: any = null

  useEffect(() => {
    document.title = "Satisfactory Werkzoig"

    if (graphContainerRef.current) {
      // Create a new graph
      graph = new LGraph();

      // Create a canvas attached to the graph
      graphContainerRef.current.width = window.innerWidth
      graphContainerRef.current.height = window.innerHeight
      const graphCanvas = new LGraphCanvas(graphContainerRef.current, graph);

      // Here you can start adding nodes to the graph
      createSatisfactoryNodes(graph);

      // load from local storage if possible 
      loadLocalStorage(graph)

      // Start rendering the graph
      // TODO: fix the speed
      graph.start(speed_ms);

      // Optional: Cleanup function if needed
      return () => {
        graph.stop();
      };
    }
  }, [])

  window.addEventListener('beforeunload', () => {
    saveLocalStorage(graph)
  });

  window.addEventListener('resize', () => {
    if (graphContainerRef.current) {
      graphContainerRef.current.width = window.innerWidth
      graphContainerRef.current.height = window.innerHeight
    }
  })

  return (<>
    <div className="navbar">
      <div className="navbar-left">
        <a id="load" onClick={(ev) => {
          var input = document.createElement('input');
          input.type = 'file';
          
          input.onchange = (e: Event) => { 
              graph.stop()
  
              const target = e.target as HTMLInputElement;
              if (target && target.files && target.files[0]) {
                var file = target.files[0]; 
                var fr = new FileReader();
                fr.readAsText(file, 'UTF-8');
  
                fr.onload = function(e) { 
                    if (e.target && typeof e.target.result === 'string') {
                      console.log(e);
                      var result = JSON.parse(e.target.result);
                      graph.configure(result)
                      graph.start(speed_ms)
                    }
                }
              }
          };
          input.click();
        }}>Load File...</a>
        <a id="save" onClick={(e) => {
          console.log("Downloading graph to file...")
          const target = e.target as HTMLAnchorElement;
          target.setAttribute("href", saveFile(graph));
          target.setAttribute("download", "werkzoig_graph.json");
          target.click();
        }}>Save File...</a>
        <a onClick={()=>{
          clearGraph(graph)
          // TEST 
          let g = ingredientGraph(itemFromName("Reinforced Iron Plate"), 100);
          createPipeline(graph, g)
          // END TEST
        }} className='bg-red-500'>Test: Produce 'Reinfored Iron Plate'...</a>
        <a id="clear" onClick={() => clearGraph(graph)}>Clear Canvas</a>
        <a id="help" onClick={() => {
          const helpModalBox = document.getElementById('help-modal-box');
          if (helpModalBox) {
            helpModalBox.style.display = "block";
          }
        }
        }>Help</a>
      </div>
      <div>
        <a href="https://satisfactory-werkzoig.de">satisfactory-werkzoig.de</a>
      </div>
      <div className="navbar-right">
        <a href="https://github.com/jandoerntlein/satisfactory-werkzoig">Github (Report a Bug)</a>
      </div>
    </div>
    <div className="help-modal" id="help-modal-box">
      <h3>Useful hints</h3>
      <ul>
        <li>Use right-click on a blank spot to open the context menu</li>
        <li>Use a left-double-click on a blank spot to open the fuzzy search to add a node</li>
        <li>By holding CTRL, you can select a group of nodes. Drag them around altogether by holding shift. </li>
        <li>Conveyor Belts are not required; however they can be useful to see their limiting effect in production</li>
        <li>The limiting input element is marked with an asterisk (*)</li>
      </ul>
      <br />
      <a id="help-modal-close" onClick={() => {
        const helpModalBox = document.getElementById('help-modal-box');
        if (helpModalBox) {
          helpModalBox.style.display = "none";
        }
      }}>Close</a>
    </div>
    <div className="litegraph">
      <canvas ref={graphContainerRef} style={{ width: '100%', height: '100%' }}></canvas>
    </div>
  </>);
}

export default App;