import React, { useEffect, useRef } from 'react';
import './App.css';
import './litegraph.css';
import { LGraph, LGraphCanvas, LiteGraph } from './lib/litegraph/litegraph.core.js';
import createSatisfactoryNodes, { createPipeline, ingredientGraph, itemFromName } from './lib/satisfactory/satisfactory';
import type { Recipe, RecipeResource, Building, Buildings, Miner, Resource, Resources, Item, Items, Recipes, Miners } from './lib/satisfactory/satisfactory-types/satisfactory-types';

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
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graph.serialize()))
  return dataStr
}

const g_items: Items = require("./data/data1.0.json").items;

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
      <div className="navbar-left flex gap-1">
        <a id="load" className="mx-auto w-full h-full text-nowrap h-[32px] flex items-center justify-center" onClick={(ev) => {
          let input = document.createElement('input');
          input.type = 'file';

          input.onchange = (e: Event) => {
            graph.stop()

            const target = e.target as HTMLInputElement;
            if (target && target.files && target.files[0]) {
              let file = target.files[0];
              let fr = new FileReader();
              fr.readAsText(file, 'UTF-8');

              fr.onload = function (e) {
                if (e.target && typeof e.target.result === 'string') {
                  console.log(e);
                  let result = JSON.parse(e.target.result);
                  graph.configure(result)
                  graph.start(speed_ms)
                }
              }
            }
          };
          input.click();
        }}>Load File...</a>
        <a id="save" className="mx-auto w-full h-full text-nowrap h-[32px] flex items-center justify-center" onClick={(e) => {
          console.log("Downloading graph to file...")
          const target = e.target as HTMLAnchorElement;
          target.setAttribute("href", saveFile(graph));
          target.setAttribute("download", "werkzoig_graph.json");
          target.click();
        }}>Save File...</a>
        <div className="bg-[#c87f0a] max-h-[32px] px-1 py-1 m-0 gap-1 flex items-center border border-[#333]">
          <select id="item-select">
            {
              Object.keys(g_items).map((key) => {
                const item = g_items[key];
                return <option key={item.slug} value={item.name}>{item.name}</option>
              })
            }
          </select>
            <input type="number" id="item-amount" placeholder="Amount" defaultValue={1} />
          <a onClick={() => {
            const itemSelect = document.getElementById('item-select') as HTMLSelectElement;
            const itemAmount = document.getElementById('item-amount') as HTMLInputElement;
            const item = itemSelect.value;
            const amount = parseInt(itemAmount.value, 10);

            if (item && !isNaN(amount)) {
              clearGraph(graph);
              let g = ingredientGraph(itemFromName(item), amount);
              createPipeline(graph, g);
            } else {
              alert('Please select an item and enter a valid amount.');
            }
          }} className='bg-red-500'>Calculate</a>
        </div>
        <a id="clear" className="mx-auto w-full h-full text-nowrap h-[32px] flex items-center justify-center" onClick={() => clearGraph(graph)}>Clear Canvas</a>
        <a id="help" className="mx-auto w-full h-full text-nowrap h-[32px] flex items-center justify-center" onClick={() => {
          const helpModalBox = document.getElementById('help-modal-box');
          if (helpModalBox) {
            helpModalBox.style.display = "block";
          }
        }
        }>Help</a>
      </div>
      <div className="navbar-right">
        <a className="mx-auto w-full h-full h-[32px] flex items-center justify-center" href="https://github.com/jandoerntlein/satisfactory-werkzoig">Github (Report a Bug)</a>
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