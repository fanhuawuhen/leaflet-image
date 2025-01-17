let mapLayersData = {};
let pointList = []
import * as turf from '@turf/turf';
import Vector from 'ol/source/Vector'
import LayerVector from 'ol/layer/Vector'
import Image from 'ol/layer/Image'
import GeoJSON from 'ol/format/GeoJSON'
import kriging from 'kriging';
import Stroke from 'ol/style/Stroke'
import Icon from 'ol/style/Icon'
import Style from 'ol/style/Style'
import Fill from 'ol/style/Fill'
import Circle from 'ol/style/Fill'
import SourceWMTS from 'ol/source/WMTS'
import ImageStatic from 'ol/source/ImageStatic'
import TilegridWMTS from 'ol/tilegrid/WMTS'
import Tile from 'ol/layer/Tile';
import Projection from 'ol/proj/Projection'


// 地图放大
export function mapZoomIn(_map) {
  let view = _map.getView();
  view.setZoom(view.getZoom() + 1);
}

// 地图缩小
export function mapZoomOut(_map) {
  let view = _map.getView();
  view.setZoom(view.getZoom() - 1);
}

// 设置地图缩放级别
export function setMapZoom(_map, zoom) {
  _map.getView().animate({
    zoom: zoom,
    duration: 500
  })
}

// 设置地图中心点
export function setMapCenter(_map, center) {
  _map.getView().animate({
    center: center,
    duration: 500
  })
}

// 设置地图中心点+缩放级别
export function setMapCenterAndZoom(_map, center, zoom) {
  _map.getView().animate({
    center: center,
    zoom: zoom,
    duration: 500
  })
}

// 根据layer设置地图视野范围
// offset 偏移信息
export function setMapViewByLayer(_map, layer, offset) {
  let extent = layer.getExtent();
  if (extent == undefined) {
    extent = layer.getSource().getExtent()
  }
  if (offset != undefined && offset.right != undefined) {
    extent[2] = extent[2] + (extent[2] - extent[0]) / 1920 * offset.right
  }
  if (offset != undefined && offset.left != undefined) {
    extent[0] = extent[0] - (extent[2] - extent[0]) / 1920 * offset.left
  }
  if (offset != undefined && offset.top != undefined) {
    extent[0] = extent[3] + (extent[3] - extent[1]) / 1080 * offset.top
  }
  if (offset != undefined && offset.bottom != undefined) {
    extent[0] = extent[1] - (extent[3] - extent[1]) / 1080 * offset.bottom
  }
  _map.getView().fit(extent, { duration: 500 });
}

// 根据extent设置地图视野范围
export function setMapViewByExtent(_map, extent) {
  _map.getView().fit(extent, { duration: 500 });
}

// 添加图层
export function mapAddLayer(_map, layer, layerId) {
  if (layerId == undefined) {
    layerId = 'layer_' + new Date().getTime();
  }
  else {
    if (mapLayersData[layerId] != undefined) {
      mapRemoveLayerById(_map, layerId)
    }
  }
  _map.addLayer(layer);
  mapLayersData[layerId] = layer;
  return layerId;
}

// 删除图层
export function mapRemoveLayer(_map, layer) {
  _map.removeLayer(layer);
}

// 根据图层id删除图层
export function mapRemoveLayerById(_map, layerId) {
  _map.removeLayer(mapLayersData[layerId]);
  delete mapLayersData[layerId];
}

// 删除所有图层
export function mapRemoveAllLayer(_map) {
  for (let key in mapLayersData) {
    mapRemoveLayerById(_map, key)
  }
}


// 根据geojson生成图层
export function getLayerByGeojson(geojson, option) {
  const sourceJsonData = new Vector({
    features: new GeoJSON().readFeatures(geojson, {featureProjection: 'EPSG:4326'})
  });
  
  return new LayerVector({
    source: sourceJsonData,
    zIndex: option.zIndex,
    style: function (f) {
      if (option.type === 'custom') {
        let optionJson = option.style(f)
        return createStyleByOption(optionJson)
      } else {
        let styleOption = {};
        if (option.type === 'point') {
          styleOption.image = new Icon({
            anchor: option.config.anchor,
            scale: option.config.scale,
            src: option.config.src
          });
        } else if (option.type === 'line') {
          const color = typeof option.config.color === 'function'
            ? option.config.color(f)  // 使用 color 函数生成颜色
            : option.config.color;
          styleOption.stroke = new Stroke({
            color: color,
            width: option.config.width,
          });
        } else if (option.type === 'polygon') {
          styleOption.fill = new Fill({
            color: option.config.fillColor
          });
          styleOption.stroke = new Stroke({
            color: option.config.strokeColor,
            width: option.config.strokeWidth,
          });
        }
        return new Style(styleOption)
      }

    }
  })
}

// 根据json生成Style
export function createStyleByOption(optionJson) {
  let styleOptionCustom = {};

  if (optionJson.fill) {
    styleOptionCustom.fill = new Fill(optionJson.fill);
  }
  if (optionJson.image && optionJson.image.stroke) {
    optionJson.image.stroke = new Stroke(optionJson.image.stroke);
  }
  if (optionJson.image && optionJson.image.fill) {
    optionJson.image.fill = new Fill(optionJson.image.fill);
  }
  if (optionJson.image && optionJson.image.radius) {
    styleOptionCustom.image = new Circle(optionJson.image);
  } else if (optionJson.image) {
    styleOptionCustom.image = new Icon(optionJson.image);
  }

  if (optionJson.stroke) {
    styleOptionCustom.stroke = new Stroke(optionJson.stroke);
  }
  if (optionJson.text) {
    styleOptionCustom.text = new Text(optionJson.text);
  }

  if (optionJson.renderer) {
    styleOptionCustom.renderer = optionJson.renderer
  }
  return new Style(styleOptionCustom)
}

// 生成WMTS图层（4326）
export function geWmtsLayers4326(obj) {
  return new Tile({
    source: new SourceWMTS({
      tileGrid: new TilegridWMTS({
        resolutions: [1.25764139776733,
          0.628820698883665,
          0.251528279553466,
          0.125764139776733,
          0.0628820698883665,
          0.0251528279553466,
          0.0125764139776733,
          0.00628820698883665,
          0.00251528279553466,
          0.00125764139776733,
          6.28820698883665E-4,
          2.51528279553466E-4,
          1.25764139776733E-4,
          6.28820698883665E-5,
          2.51528279553466E-5,
          1.25764139776733E-5,
          6.28820698883665E-6,
          2.51528279553466E-6,
          1.25764139776733E-6,
          6.28820698883665E-7,
          2.51528279553466E-7],  // 瓦片分辨率数组
        origin: [-180, 90],  // 原点（左上角）
        matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]  // 瓦片矩阵ID数组
      }),
      layer: obj.layer, // WMTS服务的图层名称
      matrixSet: obj.matrixSet,  // WMTS服务的瓦片集合名称
      format: "image/png",
      url: obj.url,
      crossOrigin: 'anonymous'
    })
  });
}

// 生成克里金差值图层
// let obj = {
//   x:[],
//   y:[],
//   z:[],
//   cluster:{
//      num:200 // 可选
//   },
//   border: border,
//   breaks:{
//    num: 6,
//    decimal: 1,
//    data:[]  // 可选
//   }
//   colors: ['rgb(0, 176, 80,0.5)', 'rgb(255, 234, 10,0.5)',
//     'rgb(255, 140, 0,0.5)',
//     'rgb(248, 35, 46,0.5)',
//     'rgb(182, 13, 139,0.5)', 'rgb(114, 0, 0,0.5)']
// }
export function getKrigingLayer(obj) {
  let x=[],y=[],z=[];

  // 判断是否需要聚类
  if(obj.cluster!=undefined){
    let clusterNum=200;
    if(obj.cluster.num!=undefined){
      clusterNum=obj.cluster.num;
    }
    let points={features:[],type: "FeatureCollection"};
    for(var i=0;i<obj.x.length;i++){
      var p=turf.point([parseFloat(obj.x[i]),parseFloat(obj.y[i])],{z:parseFloat(obj.z[i])});
      points.features.push(p);
    }
    let options = {numberOfClusters: clusterNum};
    let clustered = turf.clustersKmeans(points,options);
    for (let i = 0; i < clustered.features.length; i++){
      if(pointList.indexOf(clustered.features[i].properties.cluster)==-1){
        pointList.push(clustered.features[i].properties.cluster);
        x.push(clustered.features[i].properties.centroid[0]);
        y.push(clustered.features[i].properties.centroid[1]);
        z.push(clustered.features[i].properties.z);
      }
    }
  }
  else{
    x=obj.x;
    y=obj.y;
    z=obj.z;
  }
  let result;

  // 如果有指定的分级 则直接采用
  if(obj.breaks!=undefined&&Array.isArray(obj.breaks.data)&&obj.breaks.data.length>0){
    result = kriging.startupByBreaks(z, x, y, obj.border,obj.breaks.data);
  }
  else{
    result = kriging.startup(z, x, y, obj.border, obj.breaks.num, obj.breaks.decimal);
  }

  let datamap = {};
  for (let i = 0; i < result.breaks.length; i++) {
    datamap[result.breaks[i]] = obj.colors[i];
  }
  const sourceJsonData = new Vector({
    features: new GeoJSON().readFeatures(result.layer, { featureProjection: 'EPSG:4326' })
  });
  let layer = new LayerVector({
    source: sourceJsonData,
    style: function (f) {
      let contour_value=f.get("contour_value");
      return new Style({
        fill:new Fill({
          color: datamap[contour_value]
        }),
        stroke:new Stroke({
          color: datamap[contour_value],
          width: 0,
        })
      })
    }
  })
  result.layer=layer;
  return result;
}

export function getImgLayer(obj) {
  let extent = obj.extent;
  let projection = new Projection({
    code: 'EPSG:4326',
    units: 'pixels',
    extent: extent,
  });
  let imageLayer=new Image({
    source:new ImageStatic ({
      url:obj.url,
      projection:projection,
      imageExtent:extent
    })
  })
  return imageLayer;
}
