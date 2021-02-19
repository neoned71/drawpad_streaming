

/*


usage:

p = new Player({
  useWorker: <bool>,
  workerFile: <defaults to "Decoder.js"> // give path to Decoder.js
  webgl: true | false | "auto" // defaults to "auto"
});

// canvas property represents the canvas node
// put it somewhere in the dom
p.canvas;

p.webgl; // contains the used rendering mode. if you pass auto to webgl you can see what auto detection resulted in

p.decode(<binary>);


*/



// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["./Decoder", "./YUVWebGLCanvas"], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("./Decoder"), require("./YUVWebGLCanvas"));
    } else {
        // Browser globals (root is window)
        root.Player = factory(root.Decoder, root.YUVWebGLCanvas);
    }
}(this, function (Decoder, YUVWebGLCanvas) {
  "use strict";
  
  
  /**
 * Represents a 2-dimensional size value. 
 */
  var Size = (function size() {
    function constructor(w, h) {
      this.w = w;
      this.h = h;
    }
    constructor.prototype = {
      toString: function () {
        return "(" + this.w + ", " + this.h + ")";
      },
      getHalfSize: function() {
        return new Size(this.w >>> 1, this.h >>> 1);
      },
      length: function() {
        return this.w * this.h;
      }
    };
    return constructor;
  })();

  
  
  var Player = function(parOptions){
    var self = this;
    this._config = parOptions || {};
    
    this.render = true;
    
    this._config.workerFile = this._config.workerFile || "Decoder.js";
    
    var webgl = "auto";
    if (this._config.webgl === true){
      webgl = true;
    }else if (this._config.webgl === false){
      webgl = false;
    };
    
    if (webgl == "auto"){
      webgl = true;
      try{
        if (!window.WebGLRenderingContext) {
          // the browser doesn't even know what WebGL is
          webgl = false;
        } else {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext("webgl");
          if (!ctx) {
            // browser supports WebGL but initialization failed.
            webgl = false;
          };
        };
      }catch(e){
        webgl = false;
      };
    };
    
    this.webgl = webgl;
    
    
    var lastWidth;
    var lastHeight;
    var onPictureDecoded = function(buffer, width, height) {
      self.onPictureDecoded(buffer, width, height);
      
      if (!buffer || !self.render) {
        return;
      };
      
      if (lastWidth !== width || lastHeight !== height || !self.webGLCanvas){
        self.canvas.width = width;
        self.canvas.height = height;
        lastWidth = width;
        lastHeight = height;
        self._size = new Size(width, height);
        self.webGLCanvas = new YUVWebGLCanvas(self.canvas, self._size);
      };
      
      var lumaSize = width * height;
      var chromaSize = lumaSize >> 2;
      
      self.webGLCanvas.YTexture.fill(buffer.subarray(0, lumaSize));
      self.webGLCanvas.UTexture.fill(buffer.subarray(lumaSize, lumaSize + chromaSize));
      self.webGLCanvas.VTexture.fill(buffer.subarray(lumaSize + chromaSize, lumaSize + 2 * chromaSize));
      self.webGLCanvas.drawScene();
    };
    
    if (!webgl){
      
      onPictureDecoded = function(buffer, width, height){
        self.onPictureDecoded(buffer, width, height);
        
        if (!buffer || !self.render) {
          return;
        };


        var createImgData = false;
        var canvas = self.canvas;
        var ctx = self.ctx;
        var imgData = self.imgData;

        if (!ctx){
          self.ctx = canvas.getContext('2d');
          ctx = self.ctx;

          self.imgData = ctx.createImageData(width, height);
          imgData = self.imgData;
        };

        imgData.data.set(buffer);
        ctx.putImageData(imgData, 0, 0);

      };
      
    };
    
    if (this._config.useWorker){
      var worker = new Worker(this._config.workerFile);
      this.worker = worker;
      worker.addEventListener('message', function(e) {
        var data = e.data;
        if (data.consoleLog){
          console.log(data.consoleLog);
          return;
        };
        if (data.width){
          worker.lastDim = data;
          return;
        };
        onPictureDecoded.call(self, new Uint8Array(data), worker.lastDim.width, worker.lastDim.height);
      }, false);
      
      worker.postMessage({type: "Broadway.js - Worker init", options: {
        rgb: !webgl
      }});
      
      
      this.decode = function(parData){
        // Copy the sample so that we only do a structured clone of the
        // region of interest
        var copyU8 = new Uint8Array(parData.length);
        copyU8.set( parData, 0, parData.length );
        worker.postMessage(copyU8.buffer, [copyU8.buffer]); // Send data to our worker.
      };
      
    }else{
      
      this.decoder = new Decoder({
        rgb: !webgl
      });
      this.decoder.onPictureDecoded = onPictureDecoded;

      this.decode = function(parData){
        self.decoder.decode(parData);
      };
      
    };
    
    
    if (!this._config.size){
      this._config.size = {};
    };
    this._config.size.width = this._config.size.width || 200;
    this._config.size.height = this._config.size.height || 200;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = this._config.size.width;
    this.canvas.height = this._config.size.height;
    this.canvas.style.backgroundColor = "#333333";

    this.domNode = this.canvas;
    
    this._size = new Size(this._config.size.width, this._config.size.height);
    lastWidth = this._config.size.width;
    lastHeight = this._config.size.height;
    
  };
  
  Player.prototype = {
    
    onPictureDecoded: function(buffer, width, height){}
    
  };
  
  return Player;
  
}));



// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Decoder = factory();
    }
}(this, function () {
  "use strict";
  
  var global;
  
  function initglobal(){
    global = this;
    if (!global){
      if (typeof window != "undefined"){
        global = window;
      }else if (self != "undefined"){
        global = self;
      };
    };
  };
  initglobal();
  
  

  function error(message) {
    console.error(message);
    console.trace();
  };

  
  function assert(condition, message) {
    if (!condition) {
      error(message);
    };
  };

  
  var getModule = function(_broadwayOnHeadersDecoded, _broadwayOnPictureDecoded){
    
    var windowBak;
    if (typeof window != 'undefined'){
      windowBak = window;
    };
    var window = {
      _broadwayOnHeadersDecoded: _broadwayOnHeadersDecoded,
      _broadwayOnPictureDecoded: _broadwayOnPictureDecoded
    };
    
    /*
    
      The reason why this is all packed into one file is that this file can also function as worker.
      you can integrate the file into your build system and provide the original file to be loaded into a worker.
    
    */
    
    
function d(a){throw a;}var g=void 0,i=!0,k=null,m=!1;function n(){return function(){}}var p;p||(p=eval("(function() { try { return Module || {} } catch(e) { return {} } })()"));var aa={},r;for(r in p)p.hasOwnProperty(r)&&(aa[r]=p[r]);var t="object"===typeof process&&"function"===typeof require,ba="object"===typeof window,ca="function"===typeof importScripts,da=!ba&&!t&&!ca;
if(t){p.print||(p.print=function(a){process.stdout.write(a+"\n")});p.printErr||(p.printErr=function(a){process.stderr.write(a+"\n")});var fa=require("fs"),ga=require("path");p.read=function(a,b){var a=ga.normalize(a),c=fa.readFileSync(a);!c&&a!=ga.resolve(a)&&(a=path.join(__dirname,"..","src",a),c=fa.readFileSync(a));c&&!b&&(c=c.toString());return c};p.readBinary=function(a){return p.read(a,i)};p.load=function(a){ha(read(a))};p.thisProgram=1<process.argv.length?process.argv[1].replace(/\\/g,"/"):
"unknown-program";p.arguments=process.argv.slice(2);"undefined"!==typeof module&&(module.exports=p);process.on("uncaughtException",function(a){a instanceof ia||d(a)})}else da?(p.print||(p.print=print),"undefined"!=typeof printErr&&(p.printErr=printErr),p.read="undefined"!=typeof read?read:function(){d("no read() available (jsc?)")},p.readBinary=function(a){if("function"===typeof readbuffer)return new Uint8Array(readbuffer(a));a=read(a,"binary");w("object"===typeof a);return a},"undefined"!=typeof scriptArgs?
p.arguments=scriptArgs:"undefined"!=typeof arguments&&(p.arguments=arguments),this.Module=p,eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined")):ba||ca?(p.read=function(a){var b=new XMLHttpRequest;b.open("GET",a,m);b.send(k);return b.responseText},"undefined"!=typeof arguments&&(p.arguments=arguments),"undefined"!==typeof console?(p.print||(p.print=function(a){console.log(a)}),p.printErr||(p.printErr=function(a){console.log(a)})):p.print||(p.print=
n()),ba?window.Module=p:p.load=importScripts):d("Unknown runtime environment. Where are we?");function ha(a){eval.call(k,a)}!p.load&&p.read&&(p.load=function(a){ha(p.read(a))});p.print||(p.print=n());p.printErr||(p.printErr=p.print);p.arguments||(p.arguments=[]);p.thisProgram||(p.thisProgram="./this.program");p.print=p.print;p.fa=p.printErr;p.preRun=[];p.postRun=[];for(r in aa)aa.hasOwnProperty(r)&&(p[r]=aa[r]);
var z={Yd:function(a){ja=a},xd:function(){return ja},Tb:function(){return y},Sb:function(a){y=a},oc:function(a){switch(a){case "i1":case "i8":return 1;case "i16":return 2;case "i32":return 4;case "i64":return 8;case "float":return 4;case "double":return 8;default:return"*"===a[a.length-1]?z.ia:"i"===a[0]?(a=parseInt(a.substr(1)),w(0===a%8),a/8):0}},vd:function(a){return Math.max(z.oc(a),z.ia)},Qf:16,ng:function(a,b,c){return!c&&("i64"==a||"double"==a)?8:!a?Math.min(b,8):Math.min(b||(a?z.vd(a):0),
z.ia)},Fa:function(a,b,c){return c&&c.length?(c.splice||(c=Array.prototype.slice.call(c)),c.splice(0,0,b),p["dynCall_"+a].apply(k,c)):p["dynCall_"+a].call(k,b)},eb:[],Vc:function(a){for(var b=0;b<z.eb.length;b++)if(!z.eb[b])return z.eb[b]=a,2*(1+b);d("Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.")},Sd:function(a){z.eb[(a-2)/2]=k},og:function(a,b){z.wb||(z.wb={});var c=z.wb[a];if(c)return c;for(var c=[],e=0;e<b;e++)c.push(String.fromCharCode(36)+e);
e=ka(a);'"'===e[0]&&(e.indexOf('"',1)===e.length-1?e=e.substr(1,e.length-2):A("invalid EM_ASM input |"+e+"|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)"));try{var f=eval("(function(Module, FS) { return function("+c.join(",")+"){ "+e+" } })")(p,"undefined"!==typeof B?B:k)}catch(h){p.fa("error in executing inline EM_ASM code: "+h+" on: \n\n"+e+"\n\nwith args |"+c+"| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)"),d(h)}return z.wb[a]=
f},Aa:function(a){z.Aa.Rb||(z.Aa.Rb={});z.Aa.Rb[a]||(z.Aa.Rb[a]=1,p.fa(a))},Cb:{},rg:function(a,b){w(b);z.Cb[b]||(z.Cb[b]={});var c=z.Cb[b];c[a]||(c[a]=function(){return z.Fa(b,a,arguments)});return c[a]},Da:function(){var a=[],b=0;this.nb=function(c){c&=255;if(0==a.length){if(0==(c&128))return String.fromCharCode(c);a.push(c);b=192==(c&224)?1:224==(c&240)?2:3;return""}if(b&&(a.push(c),b--,0<b))return"";var c=a[0],e=a[1],f=a[2],h=a[3];2==a.length?c=String.fromCharCode((c&31)<<6|e&63):3==a.length?
c=String.fromCharCode((c&15)<<12|(e&63)<<6|f&63):(c=(c&7)<<18|(e&63)<<12|(f&63)<<6|h&63,c=String.fromCharCode(((c-65536)/1024|0)+55296,(c-65536)%1024+56320));a.length=0;return c};this.Ac=function(a){for(var a=unescape(encodeURIComponent(a)),b=[],f=0;f<a.length;f++)b.push(a.charCodeAt(f));return b}},pg:function(){d("You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work")},pb:function(a){var b=y;y=y+a|0;y=y+15&-16;return b},Ec:function(a){var b=
D;D=D+a|0;D=D+15&-16;return b},bb:function(a){var b=E;E=E+a|0;E=E+15&-16;E>=F&&A("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value "+F+", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.");return b},ub:function(a,b){return Math.ceil(a/(b?b:16))*(b?b:16)},Fg:function(a,b,c){return c?+(a>>>0)+4294967296*+(b>>>0):+(a>>>0)+4294967296*
+(b|0)},Pc:8,ia:4,Rf:0};p.Runtime=z;z.addFunction=z.Vc;z.removeFunction=z.Sd;var H=m,la,ma,ja;function w(a,b){a||A("Assertion failed: "+b)}function na(a){var b=p["_"+a];if(!b)try{b=eval("_"+a)}catch(c){}w(b,"Cannot call unknown function "+a+" (perhaps LLVM optimizations or closure removed it?)");return b}var oa,pa;
(function(){function a(a){a=a.toString().match(e).slice(1);return{arguments:a[0],body:a[1],returnValue:a[2]}}var b={stackSave:function(){z.Tb()},stackRestore:function(){z.Sb()},arrayToC:function(a){var b=z.pb(a.length);qa(a,b);return b},stringToC:function(a){var b=0;a!==k&&(a!==g&&0!==a)&&(b=z.pb((a.length<<2)+1),ra(a,b));return b}},c={string:b.stringToC,array:b.arrayToC};pa=function(a,b,e,f){var h=na(a),s=[],a=0;if(f)for(var v=0;v<f.length;v++){var G=c[e[v]];G?(0===a&&(a=z.Tb()),s[v]=G(f[v])):s[v]=
f[v]}e=h.apply(k,s);"string"===b&&(e=ka(e));0!==a&&z.Sb(a);return e};var e=/^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/,f={},h;for(h in b)b.hasOwnProperty(h)&&(f[h]=a(b[h]));oa=function(b,c,e){var e=e||[],h=na(b),b=e.every(function(a){return"number"===a}),x="string"!==c;if(x&&b)return h;var s=e.map(function(a,b){return"$"+b}),c="(function("+s.join(",")+") {",v=e.length;if(!b)for(var c=c+("var stack = "+f.stackSave.body+";"),G=0;G<v;G++){var ua=s[G],ea=e[G];"number"!==
ea&&(ea=f[ea+"ToC"],c+="var "+ea.arguments+" = "+ua+";",c+=ea.body+";",c+=ua+"="+ea.returnValue+";")}e=a(function(){return h}).returnValue;c+="var ret = "+e+"("+s.join(",")+");";x||(e=a(function(){return ka}).returnValue,c+="ret = "+e+"(ret);");b||(c+=f.stackRestore.body.replace("()","(stack)")+";");return eval(c+"return ret})")}})();p.cwrap=oa;p.ccall=pa;
function sa(a,b,c){c=c||"i8";"*"===c.charAt(c.length-1)&&(c="i32");switch(c){case "i1":I[a>>0]=b;break;case "i8":I[a>>0]=b;break;case "i16":J[a>>1]=b;break;case "i32":K[a>>2]=b;break;case "i64":ma=[b>>>0,(la=b,1<=+ta(la)?0<la?(va(+wa(la/4294967296),4294967295)|0)>>>0:~~+xa((la-+(~~la>>>0))/4294967296)>>>0:0)];K[a>>2]=ma[0];K[a+4>>2]=ma[1];break;case "float":ya[a>>2]=b;break;case "double":za[a>>3]=b;break;default:A("invalid type for setValue: "+c)}}p.setValue=sa;
function Aa(a,b){b=b||"i8";"*"===b.charAt(b.length-1)&&(b="i32");switch(b){case "i1":return I[a>>0];case "i8":return I[a>>0];case "i16":return J[a>>1];case "i32":return K[a>>2];case "i64":return K[a>>2];case "float":return ya[a>>2];case "double":return za[a>>3];default:A("invalid type for setValue: "+b)}return k}p.getValue=Aa;var L=2,Ba=4;p.ALLOC_NORMAL=0;p.ALLOC_STACK=1;p.ALLOC_STATIC=L;p.ALLOC_DYNAMIC=3;p.ALLOC_NONE=Ba;
function M(a,b,c,e){var f,h;"number"===typeof a?(f=i,h=a):(f=m,h=a.length);var j="string"===typeof b?b:k,c=c==Ba?e:[Ca,z.pb,z.Ec,z.bb][c===g?L:c](Math.max(h,j?1:b.length));if(f){e=c;w(0==(c&3));for(a=c+(h&-4);e<a;e+=4)K[e>>2]=0;for(a=c+h;e<a;)I[e++>>0]=0;return c}if("i8"===j)return a.subarray||a.slice?N.set(a,c):N.set(new Uint8Array(a),c),c;for(var e=0,l,u;e<h;){var q=a[e];"function"===typeof q&&(q=z.sg(q));f=j||b[e];0===f?e++:("i64"==f&&(f="i32"),sa(c+e,q,f),u!==f&&(l=z.oc(f),u=f),e+=l)}return c}
p.allocate=M;function ka(a,b){if(0===b||!a)return"";for(var c=m,e,f=0;;){e=N[a+f>>0];if(128<=e)c=i;else if(0==e&&!b)break;f++;if(b&&f==b)break}b||(b=f);var h="";if(!c){for(;0<b;)e=String.fromCharCode.apply(String,N.subarray(a,a+Math.min(b,1024))),h=h?h+e:e,a+=1024,b-=1024;return h}c=new z.Da;for(f=0;f<b;f++)e=N[a+f>>0],h+=c.nb(e);return h}p.Pointer_stringify=ka;p.UTF16ToString=function(a){for(var b=0,c="";;){var e=J[a+2*b>>1];if(0==e)return c;++b;c+=String.fromCharCode(e)}};
p.stringToUTF16=function(a,b){for(var c=0;c<a.length;++c)J[b+2*c>>1]=a.charCodeAt(c);J[b+2*a.length>>1]=0};p.UTF32ToString=function(a){for(var b=0,c="";;){var e=K[a+4*b>>2];if(0==e)return c;++b;65536<=e?(e-=65536,c+=String.fromCharCode(55296|e>>10,56320|e&1023)):c+=String.fromCharCode(e)}};p.stringToUTF32=function(a,b){for(var c=0,e=0;e<a.length;++e){var f=a.charCodeAt(e);if(55296<=f&&57343>=f)var h=a.charCodeAt(++e),f=65536+((f&1023)<<10)|h&1023;K[b+4*c>>2]=f;++c}K[b+4*c>>2]=0};
function Da(a){function b(c,e,f){var e=e||Infinity,h="",j=[],s;if("N"===a[l]){l++;"K"===a[l]&&l++;for(s=[];"E"!==a[l];)if("S"===a[l]){l++;var C=a.indexOf("_",l);s.push(q[a.substring(l,C)||0]||"?");l=C+1}else if("C"===a[l])s.push(s[s.length-1]),l+=2;else{var C=parseInt(a.substr(l)),P=C.toString().length;if(!C||!P){l--;break}var sb=a.substr(l+P,C);s.push(sb);q.push(sb);l+=P+C}l++;s=s.join("::");e--;if(0===e)return c?[s]:s}else if(("K"===a[l]||x&&"L"===a[l])&&l++,C=parseInt(a.substr(l)))P=C.toString().length,
s=a.substr(l+P,C),l+=P+C;x=m;"I"===a[l]?(l++,C=b(i),P=b(i,1,i),h+=P[0]+" "+s+"<"+C.join(", ")+">"):h=s;a:for(;l<a.length&&0<e--;)if(s=a[l++],s in u)j.push(u[s]);else switch(s){case "P":j.push(b(i,1,i)[0]+"*");break;case "R":j.push(b(i,1,i)[0]+"&");break;case "L":l++;C=a.indexOf("E",l)-l;j.push(a.substr(l,C));l+=C+2;break;case "A":C=parseInt(a.substr(l));l+=C.toString().length;"_"!==a[l]&&d("?");l++;j.push(b(i,1,i)[0]+" ["+C+"]");break;case "E":break a;default:h+="?"+s;break a}!f&&(1===j.length&&"void"===
j[0])&&(j=[]);return c?(h&&j.push(h+"?"),j):h+("("+j.join(", ")+")")}var c=!!p.___cxa_demangle;if(c)try{var e=Ca(a.length);ra(a.substr(1),e);var f=Ca(4),h=p.___cxa_demangle(e,0,0,f);if(0===Aa(f,"i32")&&h)return ka(h)}catch(j){}finally{e&&Ea(e),f&&Ea(f),h&&Ea(h)}var l=3,u={v:"void",b:"bool",c:"char",s:"short",i:"int",l:"long",f:"float",d:"double",w:"wchar_t",a:"signed char",h:"unsigned char",t:"unsigned short",j:"unsigned int",m:"unsigned long",x:"long long",y:"unsigned long long",z:"..."},q=[],x=
i,e=a;try{if("Object._main"==a||"_main"==a)return"main()";"number"===typeof a&&(a=ka(a));if("_"!==a[0]||"_"!==a[1]||"Z"!==a[2])return a;switch(a[3]){case "n":return"operator new()";case "d":return"operator delete()"}e=b()}catch(s){e+="?"}0<=e.indexOf("?")&&!c&&z.Aa("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");return e}
function Fa(){var a;a:{a=Error();if(!a.stack){try{d(Error(0))}catch(b){a=b}if(!a.stack){a="(no stack trace available)";break a}}a=a.stack.toString()}return a.replace(/__Z[\w\d_]+/g,function(a){var b=Da(a);return a===b?a:a+" ["+b+"]"})}p.stackTrace=function(){return Fa()};for(var I,N,J,Ga,K,Ha,ya,za,Ia=0,D=0,Ja=0,y=0,Ka=0,La=0,E=0,Ma=p.TOTAL_STACK||5242880,F=p.TOTAL_MEMORY||52428800,O=65536;O<F||O<2*Ma;)O=16777216>O?2*O:O+16777216;
O!==F&&(p.fa("increasing TOTAL_MEMORY to "+O+" to be compliant with the asm.js spec"),F=O);w("undefined"!==typeof Int32Array&&"undefined"!==typeof Float64Array&&!!(new Int32Array(1)).subarray&&!!(new Int32Array(1)).set,"JS engine does not provide full typed array support");var Q=new ArrayBuffer(F);I=new Int8Array(Q);J=new Int16Array(Q);K=new Int32Array(Q);N=new Uint8Array(Q);Ga=new Uint16Array(Q);Ha=new Uint32Array(Q);ya=new Float32Array(Q);za=new Float64Array(Q);K[0]=255;w(255===N[0]&&0===N[3],"Typed arrays 2 must be run on a little-endian system");
p.HEAP=g;p.buffer=Q;p.HEAP8=I;p.HEAP16=J;p.HEAP32=K;p.HEAPU8=N;p.HEAPU16=Ga;p.HEAPU32=Ha;p.HEAPF32=ya;p.HEAPF64=za;function Na(a){for(;0<a.length;){var b=a.shift();if("function"==typeof b)b();else{var c=b.ja;"number"===typeof c?b.Xa===g?z.Fa("v",c):z.Fa("vi",c,[b.Xa]):c(b.Xa===g?k:b.Xa)}}}var Oa=[],R=[],Pa=[],Qa=[],Ra=[],Sa=m;function Ta(a){Oa.unshift(a)}p.addOnPreRun=p.Xf=Ta;p.addOnInit=p.Uf=function(a){R.unshift(a)};p.addOnPreMain=p.Wf=function(a){Pa.unshift(a)};p.addOnExit=p.Tf=function(a){Qa.unshift(a)};
function Ua(a){Ra.unshift(a)}p.addOnPostRun=p.Vf=Ua;function Va(a,b,c){a=(new z.Da).Ac(a);c&&(a.length=c);b||a.push(0);return a}p.intArrayFromString=Va;p.intArrayToString=function(a){for(var b=[],c=0;c<a.length;c++){var e=a[c];255<e&&(e&=255);b.push(String.fromCharCode(e))}return b.join("")};function ra(a,b,c){a=Va(a,c);for(c=0;c<a.length;)I[b+c>>0]=a[c],c+=1}p.writeStringToMemory=ra;function qa(a,b){for(var c=0;c<a.length;c++)I[b+c>>0]=a[c]}p.writeArrayToMemory=qa;
p.writeAsciiToMemory=function(a,b,c){for(var e=0;e<a.length;e++)I[b+e>>0]=a.charCodeAt(e);c||(I[b+a.length>>0]=0)};if(!Math.imul||-5!==Math.imul(4294967295,5))Math.imul=function(a,b){var c=a&65535,e=b&65535;return c*e+((a>>>16)*e+c*(b>>>16)<<16)|0};Math.vg=Math.imul;var ta=Math.abs,xa=Math.ceil,wa=Math.floor,va=Math.min,S=0,Wa=k,Xa=k;function Ya(){S++;p.monitorRunDependencies&&p.monitorRunDependencies(S)}p.addRunDependency=Ya;
function Za(){S--;p.monitorRunDependencies&&p.monitorRunDependencies(S);if(0==S&&(Wa!==k&&(clearInterval(Wa),Wa=k),Xa)){var a=Xa;Xa=k;a()}}p.removeRunDependency=Za;p.preloadedImages={};p.preloadedAudios={};var T=k,Ia=8,D=Ia+7808;R.push();
M([0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,7,7,7,7,7,7,8,8,8,8,0,0,0,0,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,0,0,0,0,10,0,0,0,13,0,0,0,16,0,0,0,11,0,0,0,14,0,0,0,18,0,0,0,13,0,0,0,16,0,0,0,20,0,0,0,14,0,0,0,18,0,0,0,23,0,0,0,16,0,0,0,20,0,0,0,25,0,0,0,18,0,0,0,23,0,0,0,29,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,12,0,0,0,13,0,
0,0,14,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,18,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,22,0,0,0,23,0,0,0,24,0,0,0,25,0,0,0,26,0,0,0,27,0,0,0,28,0,0,0,29,0,0,0,29,0,0,0,30,0,0,0,31,0,0,0,32,0,0,0,32,0,0,0,33,0,0,0,34,0,0,0,34,0,0,0,35,0,0,0,35,0,0,0,36,0,0,0,36,0,0,0,37,0,0,0,37,0,0,0,37,0,0,0,38,0,0,0,38,0,0,0,38,0,0,0,39,0,0,0,39,0,0,0,39,0,0,0,39,0,0,0,1,0,0,0,2,0,0,0,4,0,0,0,8,0,0,0,16,0,0,0,32,0,0,0,64,0,0,0,128,0,0,0,1,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,3,0,0,0,3,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,1,0,0,0,4,0,0,
0,5,0,0,0,2,0,0,0,3,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,12,0,0,0,13,0,0,0,10,0,0,0,11,0,0,0,14,0,0,0,15,0,0,0,47,31,15,0,23,27,29,30,7,11,13,14,39,43,45,46,16,3,5,10,12,19,21,26,28,35,37,42,44,1,2,4,8,17,18,20,24,6,9,22,25,32,33,34,36,40,38,41,0,16,1,2,4,8,32,3,5,10,12,15,47,7,11,13,14,6,9,31,35,37,42,44,33,34,36,40,39,43,45,46,17,18,20,24,19,21,26,28,23,27,29,30,22,25,38,41,17,1,0,0,0,0,0,0,34,18,1,1,0,0,0,0,50,34,18,2,0,0,0,0,67,51,34,34,18,18,2,2,83,67,51,35,18,18,2,2,19,35,67,51,99,83,2,2,0,
0,101,85,68,68,52,52,35,35,35,35,19,19,19,19,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,249,233,217,200,200,184,184,167,167,167,167,151,151,151,151,134,134,134,134,134,134,134,134,118,118,118,118,118,118,118,118,230,214,198,182,165,165,149,149,132,132,132,132,116,116,116,116,100,100,100,100,84,84,84,84,67,67,67,67,67,67,67,67,51,51,51,51,51,51,51,51,35,35,35,35,35,35,35,35,19,19,19,19,19,19,19,19,3,3,3,3,3,3,3,3,214,182,197,197,165,165,149,149,132,132,132,132,84,84,84,84,68,68,68,68,4,4,4,4,115,115,115,115,
115,115,115,115,99,99,99,99,99,99,99,99,51,51,51,51,51,51,51,51,35,35,35,35,35,35,35,35,19,19,19,19,19,19,19,19,197,181,165,5,148,148,116,116,52,52,36,36,131,131,131,131,99,99,99,99,83,83,83,83,67,67,67,67,19,19,19,19,181,149,164,164,132,132,36,36,20,20,4,4,115,115,115,115,99,99,99,99,83,83,83,83,67,67,67,67,51,51,51,51,166,6,21,21,132,132,132,132,147,147,147,147,147,147,147,147,115,115,115,115,115,115,115,115,99,99,99,99,99,99,99,99,83,83,83,83,83,83,83,83,67,67,67,67,67,67,67,67,51,51,51,51,51,
51,51,51,35,35,35,35,35,35,35,35,150,6,21,21,116,116,116,116,131,131,131,131,131,131,131,131,99,99,99,99,99,99,99,99,67,67,67,67,67,67,67,67,51,51,51,51,51,51,51,51,35,35,35,35,35,35,35,35,82,82,82,82,82,82,82,82,82,82,82,82,82,82,82,82,134,6,37,37,20,20,20,20,115,115,115,115,115,115,115,115,99,99,99,99,99,99,99,99,51,51,51,51,51,51,51,51,82,82,82,82,82,82,82,82,82,82,82,82,82,82,82,82,66,66,66,66,66,66,66,66,66,66,66,66,66,66,66,66,22,6,117,117,36,36,36,36,83,83,83,83,83,83,83,83,98,98,98,98,98,
98,98,98,98,98,98,98,98,98,98,98,66,66,66,66,66,66,66,66,66,66,66,66,66,66,66,66,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,21,5,100,100,35,35,35,35,82,82,82,82,82,82,82,82,66,66,66,66,66,66,66,66,50,50,50,50,50,50,50,50,4,20,35,35,51,51,83,83,65,65,65,65,65,65,65,65,4,20,67,67,34,34,34,34,49,49,49,49,49,49,49,49,3,19,50,50,33,33,33,33,2,18,33,33,0,0,0,0,0,0,0,0,0,0,102,32,38,16,6,8,101,24,101,24,67,16,67,16,67,16,67,16,67,16,67,16,67,16,67,16,34,8,34,8,34,8,34,8,34,8,34,8,34,8,34,8,34,8,34,
8,34,8,34,8,34,8,34,8,34,8,34,8,0,0,0,0,0,0,0,0,106,64,74,48,42,40,10,32,105,56,105,56,73,40,73,40,41,32,41,32,9,24,9,24,104,48,104,48,104,48,104,48,72,32,72,32,72,32,72,32,40,24,40,24,40,24,40,24,8,16,8,16,8,16,8,16,103,40,103,40,103,40,103,40,103,40,103,40,103,40,103,40,71,24,71,24,71,24,71,24,71,24,71,24,71,24,71,24,110,96,78,88,46,80,14,80,110,88,78,80,46,72,14,72,13,64,13,64,77,72,77,72,45,64,45,64,13,56,13,56,109,80,109,80,77,64,77,64,45,56,45,56,13,48,13,48,107,72,107,72,107,72,107,72,107,
72,107,72,107,72,107,72,75,56,75,56,75,56,75,56,75,56,75,56,75,56,75,56,43,48,43,48,43,48,43,48,43,48,43,48,43,48,43,48,11,40,11,40,11,40,11,40,11,40,11,40,11,40,11,40,0,0,0,0,47,104,47,104,16,128,80,128,48,128,16,120,112,128,80,120,48,120,16,112,112,120,80,112,48,112,16,104,111,112,111,112,79,104,79,104,47,96,47,96,15,96,15,96,111,104,111,104,79,96,79,96,47,88,47,88,15,88,15,88,0,0,0,0,0,0,0,0,102,56,70,32,38,32,6,16,102,48,70,24,38,24,6,8,101,40,101,40,37,16,37,16,100,32,100,32,100,32,100,32,100,
24,100,24,100,24,100,24,67,16,67,16,67,16,67,16,67,16,67,16,67,16,67,16,0,0,0,0,0,0,0,0,105,72,73,56,41,56,9,48,8,40,8,40,72,48,72,48,40,48,40,48,8,32,8,32,103,64,103,64,103,64,103,64,71,40,71,40,71,40,71,40,39,40,39,40,39,40,39,40,7,24,7,24,7,24,7,24,0,0,0,0,109,120,109,120,110,128,78,128,46,128,14,128,46,120,14,120,78,120,46,112,77,112,77,112,13,112,13,112,109,112,109,112,77,104,77,104,45,104,45,104,13,104,13,104,109,104,109,104,77,96,77,96,45,96,45,96,13,96,13,96,12,88,12,88,12,88,12,88,76,88,
76,88,76,88,76,88,44,88,44,88,44,88,44,88,12,80,12,80,12,80,12,80,108,96,108,96,108,96,108,96,76,80,76,80,76,80,76,80,44,80,44,80,44,80,44,80,12,72,12,72,12,72,12,72,107,88,107,88,107,88,107,88,107,88,107,88,107,88,107,88,75,72,75,72,75,72,75,72,75,72,75,72,75,72,75,72,43,72,43,72,43,72,43,72,43,72,43,72,43,72,43,72,11,64,11,64,11,64,11,64,11,64,11,64,11,64,11,64,107,80,107,80,107,80,107,80,107,80,107,80,107,80,107,80,75,64,75,64,75,64,75,64,75,64,75,64,75,64,75,64,43,64,43,64,43,64,43,64,43,64,43,
64,43,64,43,64,11,56,11,56,11,56,11,56,11,56,11,56,11,56,11,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,24,70,56,38,56,6,16,102,72,70,48,38,48,6,8,37,40,37,40,69,40,69,40,37,32,37,32,69,32,69,32,37,24,37,24,101,64,101,64,69,24,69,24,37,16,37,16,100,56,100,56,100,56,100,56,100,48,100,48,100,48,100,48,100,40,100,40,100,40,100,40,100,32,100,32,100,32,100,32,100,24,100,24,100,24,100,24,68,16,68,16,68,16,68,16,36,8,36,8,36,8,36,8,4,0,4,0,4,0,4,0,0,0,10,128,106,128,74,128,42,128,10,120,106,120,74,120,42,120,10,
112,106,112,74,112,42,112,10,104,41,104,41,104,9,96,9,96,73,104,73,104,41,96,41,96,9,88,9,88,105,104,105,104,73,96,73,96,41,88,41,88,9,80,9,80,104,96,104,96,104,96,104,96,72,88,72,88,72,88,72,88,40,80,40,80,40,80,40,80,8,72,8,72,8,72,8,72,104,88,104,88,104,88,104,88,72,80,72,80,72,80,72,80,40,72,40,72,40,72,40,72,8,64,8,64,8,64,8,64,7,56,7,56,7,56,7,56,7,56,7,56,7,56,7,56,7,48,7,48,7,48,7,48,7,48,7,48,7,48,7,48,71,72,71,72,71,72,71,72,71,72,71,72,71,72,71,72,7,40,7,40,7,40,7,40,7,40,7,40,7,40,7,40,
103,80,103,80,103,80,103,80,103,80,103,80,103,80,103,80,71,64,71,64,71,64,71,64,71,64,71,64,71,64,71,64,39,64,39,64,39,64,39,64,39,64,39,64,39,64,39,64,7,32,7,32,7,32,7,32,7,32,7,32,7,32,7,32,6,8,38,8,0,0,6,0,6,16,38,16,70,16,0,0,6,24,38,24,70,24,102,24,6,32,38,32,70,32,102,32,6,40,38,40,70,40,102,40,6,48,38,48,70,48,102,48,6,56,38,56,70,56,102,56,6,64,38,64,70,64,102,64,6,72,38,72,70,72,102,72,6,80,38,80,70,80,102,80,6,88,38,88,70,88,102,88,6,96,38,96,70,96,102,96,6,104,38,104,70,104,102,104,6,112,
38,112,70,112,102,112,6,120,38,120,70,120,102,120,6,128,38,128,70,128,102,128,0,0,67,16,2,0,2,0,33,8,33,8,33,8,33,8,103,32,103,32,72,32,40,32,71,24,71,24,39,24,39,24,6,32,6,32,6,32,6,32,6,24,6,24,6,24,6,24,6,16,6,16,6,16,6,16,102,24,102,24,102,24,102,24,38,16,38,16,38,16,38,16,6,8,6,8,6,8,6,8,3,0,0,0,15,0,0,0,1,0,0,0,10,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,13,0,0,0,4,0,0,0,8,0,0,0,4,0,0,0,3,
0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,12,0,0,0,3,0,0,0,19,0,0,0,1,0,0,0,18,0,0,0,0,0,0,0,17,0,0,0,4,0,0,0,16,0,0,0,3,0,0,0,23,0,0,0,1,0,0,0,22,0,0,0,0,0,0,0,21,0,0,0,4,0,0,0,20,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,4,0,0,0,1,0,0,0,255,0,0,0,4,0,0,0,1,0,0,0,15,0,0,0,2,0,0,0,10,0,0,0,4,0,0,0,5,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,9,0,0,0,255,0,0,0,12,0,0,0,4,0,0,0,7,0,0,0,255,0,0,0,2,0,0,0,4,0,0,0,13,0,0,0,255,0,0,0,8,0,0,0,1,0,0,0,19,0,0,0,2,0,0,0,18,0,0,0,4,0,
0,0,17,0,0,0,255,0,0,0,16,0,0,0,1,0,0,0,23,0,0,0,2,0,0,0,22,0,0,0,4,0,0,0,21,0,0,0,255,0,0,0,20,0,0,0,1,0,0,0,10,0,0,0,1,0,0,0,11,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,1,0,0,0,14,0,0,0,1,0,0,0,15,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,8,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,7,0,0,0,4,0,0,0,12,0,0,0,4,0,0,0,13,0,0,0,1,0,0,0,18,0,0,0,1,0,0,0,19,0,0,0,4,0,0,0,16,0,0,0,4,0,0,0,17,0,0,0,1,0,0,0,22,0,0,0,1,0,0,0,23,0,0,0,4,0,0,0,20,0,0,0,4,0,0,0,21,0,0,0,0,
0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,0,0,0,0,13,0,0,0,4,0,0,0,8,0,0,0,0,0,0,0,15,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,12,0,0,0,4,0,0,0,11,0,0,0,4,0,0,0,14,0,0,0,0,0,0,0,17,0,0,0,4,0,0,0,16,0,0,0,0,0,0,0,19,0,0,0,4,0,0,0,18,0,0,0,0,0,0,0,21,0,0,0,4,0,0,0,20,0,0,0,0,0,0,0,23,0,0,0,4,0,0,0,22,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,8,0,0,0,12,0,0,0,8,0,0,0,12,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,8,0,0,0,
12,0,0,0,8,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,4,0,0,0,8,0,0,0,8,0,0,0,12,0,0,0,12,0,0,0,8,0,0,0,8,0,0,0,12,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,
109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,
235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,3,0,0,0,15,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,3,0,0,0,15,0,0,0,0,0,0,0,5,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,3,0,0,0,15,0,0,0,1,0,0,0,10,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,3,0,0,0,15,0,0,0,1,0,0,0,10,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,4,0,0,0,1,0,0,0,255,0,
0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,0,0,0,0,7,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,13,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,13,0,0,0,4,0,0,0,8,0,0,0,4,0,0,0,3,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,
0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,9,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,12,0,0,0,1,0,0,0,14,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,14,0,0,0,255,0,0,0,4,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,11,0,0,0,1,0,0,0,14,0,0,0,4,0,0,0,1,0,0,0,255,0,0,0,4,0,0,0,2,0,0,0,10,0,0,
0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,2,0,0,0,10,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,15,0,0,0,2,0,0,0,10,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,15,0,0,0,2,0,0,0,10,0,0,0,4,0,0,0,5,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,255,0,0,0,12,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,
0,0,4,0,0,0,9,0,0,0,255,0,0,0,12,0,0,0,255,0,0,0,2,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,2,0,0,0,255,0,0,0,8,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,7,0,0,0,255,0,0,0,2,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,7,0,0,0,255,0,0,0,2,0,0,0,4,0,0,0,13,0,0,0,255,0,0,0,8,0,0,0,1,0,0,0,10,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,10,0,0,0,4,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,10,0,0,0,1,0,0,0,11,0,0,0,255,0,
0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,10,0,0,0,1,0,0,0,11,0,0,0,4,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,1,0,0,0,14,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,14,0,0,0,4,0,0,0,4,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,14,0,0,0,1,0,0,0,15,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,1,0,0,0,14,0,0,0,1,0,0,0,15,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,5,0,0,0,4,0,0,0,2,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,8,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,
0,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,3,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,8,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,6,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,12,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,7,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,6,0,0,0,4,0,0,0,7,0,0,0,4,0,0,0,12,0,0,0,4,0,0,0,13,0,0,0,0,0,0,0,5,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,
0,0,0,7,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,1,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,3,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0,3,0,0,0,4,0,0,0,6,0,0,0,0,0,0,0,13,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,
0,0,255,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,15,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,0,0,0,8,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,0,0,0,8,0,0,0,0,0,0,0,15,0,0,0,4,0,0,0,10,0,0,0,4,0,0,0,9,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,11,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,12,0,0,0,255,0,0,0,0,0,0,0,255,0,0,0,0,0,0,0,4,0,0,0,9,0,0,0,4,0,0,0,12,0,0,0,4,0,0,0,11,0,0,0,4,0,0,0,14,0,0,
0,0,0,0,0,1,0,0,0,2,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,9,0,0,0,10,0,0,0,11,0,0,0,12,0,0,0,13,0,0,0,14,0,0,0,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,5,6,7,8,9,10,12,13,15,17,20,22,25,28,32,36,40,45,50,56,63,71,80,90,101,113,127,144,162,182,203,226,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,3,3,3,3,4,4,4,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16,17,17,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,2,1,2,3,1,2,3,2,2,3,2,2,4,2,3,4,2,3,4,3,3,5,3,4,6,3,4,6,4,5,7,4,5,8,4,6,9,5,7,10,6,8,11,6,8,13,7,10,14,8,11,16,9,12,18,10,13,20,11,15,23,13,17,25,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,68,69,67,79,68,69,82,32,73,78,73,84,73,65,76,73,90,65,84,73,79,78,32,70,65,73,76,69,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"i8",Ba,z.Pc);var $a=z.ub(M(12,"i8",L),8);w(0==$a%8);
var U={O:1,Q:2,Ef:3,De:4,ha:5,Zb:6,be:7,$e:8,V:9,oe:10,Ca:11,Of:11,Mc:12,qb:13,ye:14,mf:15,ga:16,Xb:17,Oc:18,Qa:19,Sa:20,pa:21,B:22,Ve:23,Lc:24,Nc:25,Lf:26,ze:27,hf:28,Ua:29,Bf:30,Oe:31,uf:32,ve:33,yf:34,df:42,Be:43,pe:44,Fe:45,Ge:46,He:47,Ne:48,Mf:49,Ye:50,Ee:51,te:35,af:37,ge:52,je:53,Pf:54,We:55,ke:56,le:57,ue:35,me:59,kf:60,Ze:61,If:62,jf:63,ef:64,ff:65,Af:66,bf:67,ee:68,Ff:69,qe:70,vf:71,Qe:72,we:73,ie:74,qf:76,he:77,zf:78,Ie:79,Je:80,Me:81,Le:82,Ke:83,lf:38,sb:39,Re:36,rb:40,Ta:95,tf:96,se:104,
Xe:105,fe:97,xf:91,of:88,gf:92,Cf:108,Wb:111,ce:98,re:103,Ue:101,Se:100,Jf:110,Ae:112,Yb:113,Jc:115,Hc:114,Ic:89,Pe:90,wf:93,Df:94,de:99,Te:102,Kc:106,Ra:107,Kf:109,Nf:87,xe:122,Gf:116,pf:95,cf:123,Ce:84,rf:75,ne:125,nf:131,sf:130,Hf:86},ab={"0":"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",
12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",
34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",
53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",
74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",
90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",
107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"},bb=0;function V(a){return K[bb>>2]=a}
function cb(a,b){for(var c=0,e=a.length-1;0<=e;e--){var f=a[e];"."===f?a.splice(e,1):".."===f?(a.splice(e,1),c++):c&&(a.splice(e,1),c--)}if(b)for(;c--;c)a.unshift("..");return a}function db(a){var b="/"===a.charAt(0),c="/"===a.substr(-1),a=cb(a.split("/").filter(function(a){return!!a}),!b).join("/");!a&&!b&&(a=".");a&&c&&(a+="/");return(b?"/":"")+a}
function eb(a){var b=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1),a=b[0],b=b[1];if(!a&&!b)return".";b&&(b=b.substr(0,b.length-1));return a+b}function W(a){if("/"===a)return"/";var b=a.lastIndexOf("/");return-1===b?a:a.substr(b+1)}function fb(){var a=Array.prototype.slice.call(arguments,0);return db(a.join("/"))}function X(a,b){return db(a+"/"+b)}
function gb(){for(var a="",b=m,c=arguments.length-1;-1<=c&&!b;c--){b=0<=c?arguments[c]:B.yb();"string"!==typeof b&&d(new TypeError("Arguments to path.resolve must be strings"));if(!b)return"";a=b+"/"+a;b="/"===b.charAt(0)}a=cb(a.split("/").filter(function(a){return!!a}),!b).join("/");return(b?"/":"")+a||"."}
function hb(a,b){function c(a){for(var b=0;b<a.length&&""===a[b];b++);for(var c=a.length-1;0<=c&&""===a[c];c--);return b>c?[]:a.slice(b,c-b+1)}for(var a=gb(a).substr(1),b=gb(b).substr(1),e=c(a.split("/")),f=c(b.split("/")),h=Math.min(e.length,f.length),j=h,l=0;l<h;l++)if(e[l]!==f[l]){j=l;break}h=[];for(l=j;l<e.length;l++)h.push("..");h=h.concat(f.slice(j));return h.join("/")}var ib=[];function jb(a,b){ib[a]={input:[],K:[],sa:b};B.Ob(a,kb)}
var kb={open:function(a){var b=ib[a.g.ob];b||d(new B.e(U.Qa));a.N=b;a.seekable=m},close:function(a){a.N.sa.flush(a.N)},flush:function(a){a.N.sa.flush(a.N)},M:function(a,b,c,e){(!a.N||!a.N.sa.rc)&&d(new B.e(U.Zb));for(var f=0,h=0;h<e;h++){var j;try{j=a.N.sa.rc(a.N)}catch(l){d(new B.e(U.ha))}j===g&&0===f&&d(new B.e(U.Ca));if(j===k||j===g)break;f++;b[c+h]=j}f&&(a.g.timestamp=Date.now());return f},write:function(a,b,c,e){(!a.N||!a.N.sa.Lb)&&d(new B.e(U.Zb));for(var f=0;f<e;f++)try{a.N.sa.Lb(a.N,b[c+f])}catch(h){d(new B.e(U.ha))}e&&
(a.g.timestamp=Date.now());return f}},mb={rc:function(a){if(!a.input.length){var b=k;if(t){if(b=process.stdin.read(),!b){if(process.stdin._readableState&&process.stdin._readableState.ended)return k;return}}else"undefined"!=typeof window&&"function"==typeof window.prompt?(b=window.prompt("Input: "),b!==k&&(b+="\n")):"function"==typeof readline&&(b=readline(),b!==k&&(b+="\n"));if(!b)return k;a.input=Va(b,i)}return a.input.shift()},flush:function(a){a.K&&0<a.K.length&&(p.print(a.K.join("")),a.K=[])},
Lb:function(a,b){b===k||10===b?(p.print(a.K.join("")),a.K=[]):a.K.push(lb.nb(b))}},nb={Lb:function(a,b){b===k||10===b?(p.printErr(a.K.join("")),a.K=[]):a.K.push(lb.nb(b))},flush:function(a){a.K&&0<a.K.length&&(p.printErr(a.K.join("")),a.K=[])}},Y={U:k,F:function(){return Y.createNode(k,"/",16895,0)},createNode:function(a,b,c,e){(B.Bd(c)||B.Cd(c))&&d(new B.e(U.O));Y.U||(Y.U={dir:{g:{S:Y.n.S,I:Y.n.I,ra:Y.n.ra,ba:Y.n.ba,rename:Y.n.rename,za:Y.n.za,Oa:Y.n.Oa,Na:Y.n.Na,ca:Y.n.ca},A:{$:Y.p.$}},file:{g:{S:Y.n.S,
I:Y.n.I},A:{$:Y.p.$,M:Y.p.M,write:Y.p.write,Ea:Y.p.Ea,Ja:Y.p.Ja}},link:{g:{S:Y.n.S,I:Y.n.I,ta:Y.n.ta},A:{}},ec:{g:{S:Y.n.S,I:Y.n.I},A:B.bd}});c=B.createNode(a,b,c,e);B.J(c.mode)?(c.n=Y.U.dir.g,c.p=Y.U.dir.A,c.k={}):B.isFile(c.mode)?(c.n=Y.U.file.g,c.p=Y.U.file.A,c.q=0,c.k=k):B.Ia(c.mode)?(c.n=Y.U.link.g,c.p=Y.U.link.A):B.ib(c.mode)&&(c.n=Y.U.ec.g,c.p=Y.U.ec.A);c.timestamp=Date.now();a&&(a.k[b]=c);return c},ud:function(a){if(a.k&&a.k.subarray){for(var b=[],c=0;c<a.q;++c)b.push(a.k[c]);return b}return a.k},
qg:function(a){return!a.k?new Uint8Array:a.k.subarray?a.k.subarray(0,a.q):new Uint8Array(a.k)},lc:function(a,b){a.k&&(a.k.subarray&&b>a.k.length)&&(a.k=Y.ud(a),a.q=a.k.length);if(!a.k||a.k.subarray){var c=a.k?a.k.buffer.byteLength:0;c>=b||(b=Math.max(b,c*(1048576>c?2:1.125)|0),0!=c&&(b=Math.max(b,256)),c=a.k,a.k=new Uint8Array(b),0<a.q&&a.k.set(c.subarray(0,a.q),0))}else{!a.k&&0<b&&(a.k=[]);for(;a.k.length<b;)a.k.push(0)}},Ud:function(a,b){if(a.q!=b)if(0==b)a.k=k,a.q=0;else{if(!a.k||a.k.subarray){var c=
a.k;a.k=new Uint8Array(new ArrayBuffer(b));c&&a.k.set(c.subarray(0,Math.min(b,a.q)))}else if(a.k||(a.k=[]),a.k.length>b)a.k.length=b;else for(;a.k.length<b;)a.k.push(0);a.q=b}},n:{S:function(a){var b={};b.gg=B.ib(a.mode)?a.id:1;b.wg=a.id;b.mode=a.mode;b.Ig=1;b.uid=0;b.ug=0;b.ob=a.ob;b.size=B.J(a.mode)?4096:B.isFile(a.mode)?a.q:B.Ia(a.mode)?a.link.length:0;b.Zf=new Date(a.timestamp);b.Hg=new Date(a.timestamp);b.eg=new Date(a.timestamp);b.Zc=4096;b.$f=Math.ceil(b.size/b.Zc);return b},I:function(a,b){b.mode!==
g&&(a.mode=b.mode);b.timestamp!==g&&(a.timestamp=b.timestamp);b.size!==g&&Y.Ud(a,b.size)},ra:function(){d(B.Db[U.Q])},ba:function(a,b,c,e){return Y.createNode(a,b,c,e)},rename:function(a,b,c){if(B.J(a.mode)){var e;try{e=B.aa(b,c)}catch(f){}if(e)for(var h in e.k)d(new B.e(U.sb))}delete a.parent.k[a.name];a.name=c;b.k[c]=a;a.parent=b},za:function(a,b){delete a.k[b]},Oa:function(a,b){var c=B.aa(a,b),e;for(e in c.k)d(new B.e(U.sb));delete a.k[b]},Na:function(a){var b=[".",".."],c;for(c in a.k)a.k.hasOwnProperty(c)&&
b.push(c);return b},ca:function(a,b,c){a=Y.createNode(a,b,41471,0);a.link=c;return a},ta:function(a){B.Ia(a.mode)||d(new B.e(U.B));return a.link}},p:{M:function(a,b,c,e,f){var h=a.g.k;if(f>=a.g.q)return 0;a=Math.min(a.g.q-f,e);w(0<=a);if(8<a&&h.subarray)b.set(h.subarray(f,f+a),c);else for(e=0;e<a;e++)b[c+e]=h[f+e];return a},write:function(a,b,c,e,f,h){if(!e)return 0;a=a.g;a.timestamp=Date.now();if(b.subarray&&(!a.k||a.k.subarray)){if(h)return a.k=b.subarray(c,c+e),a.q=e;if(0===a.q&&0===f)return a.k=
new Uint8Array(b.subarray(c,c+e)),a.q=e;if(f+e<=a.q)return a.k.set(b.subarray(c,c+e),f),e}Y.lc(a,f+e);if(a.k.subarray&&b.subarray)a.k.set(b.subarray(c,c+e),f);else for(h=0;h<e;h++)a.k[f+h]=b[c+h];a.q=Math.max(a.q,f+e);return e},$:function(a,b,c){1===c?b+=a.position:2===c&&B.isFile(a.g.mode)&&(b+=a.g.q);0>b&&d(new B.e(U.B));return b},Ea:function(a,b,c){Y.lc(a.g,b+c);a.g.q=Math.max(a.g.q,b+c)},Ja:function(a,b,c,e,f,h,j){B.isFile(a.g.mode)||d(new B.e(U.Qa));c=a.g.k;if(!(j&2)&&(c.buffer===b||c.buffer===
b.buffer))a=m,e=c.byteOffset;else{if(0<f||f+e<a.g.q)c=c.subarray?c.subarray(f,f+e):Array.prototype.slice.call(c,f,f+e);a=i;(e=Ca(e))||d(new B.e(U.Mc));b.set(c,e)}return{Lg:e,Yf:a}}}},ob=M(1,"i32*",L),pb=M(1,"i32*",L),qb=M(1,"i32*",L),B={root:k,La:[],ic:[k],oa:[],Jd:1,T:k,hc:"/",hb:m,vc:i,H:{},Gc:{yc:{Rc:1,Sc:2}},e:k,Db:{},sc:function(a){a instanceof B.e||d(a+" : "+Fa());return V(a.cb)},u:function(a,b){a=gb(B.yb(),a);b=b||{};if(!a)return{path:"",g:k};var c={Bb:i,Nb:0},e;for(e in c)b[e]===g&&(b[e]=
c[e]);8<b.Nb&&d(new B.e(U.rb));var c=cb(a.split("/").filter(function(a){return!!a}),m),f=B.root;e="/";for(var h=0;h<c.length;h++){var j=h===c.length-1;if(j&&b.parent)break;f=B.aa(f,c[h]);e=X(e,c[h]);if(B.ka(f)&&(!j||j&&b.Bb))f=f.Ka.root;if(!j||b.R)for(j=0;B.Ia(f.mode);)f=B.ta(e),e=gb(eb(e),f),f=B.u(e,{Nb:b.Nb}).g,40<j++&&d(new B.e(U.rb))}return{path:e,g:f}},da:function(a){for(var b;;){if(B.jb(a))return a=a.F.Id,!b?a:"/"!==a[a.length-1]?a+"/"+b:a+b;b=b?a.name+"/"+b:a.name;a=a.parent}},Fb:function(a,
b){for(var c=0,e=0;e<b.length;e++)c=(c<<5)-c+b.charCodeAt(e)|0;return(a+c>>>0)%B.T.length},tc:function(a){var b=B.Fb(a.parent.id,a.name);a.ma=B.T[b];B.T[b]=a},uc:function(a){var b=B.Fb(a.parent.id,a.name);if(B.T[b]===a)B.T[b]=a.ma;else for(b=B.T[b];b;){if(b.ma===a){b.ma=a.ma;break}b=b.ma}},aa:function(a,b){var c=B.Gd(a);c&&d(new B.e(c,a));for(c=B.T[B.Fb(a.id,b)];c;c=c.ma){var e=c.name;if(c.parent.id===a.id&&e===b)return c}return B.ra(a,b)},createNode:function(a,b,c,e){B.Va||(B.Va=function(a,b,c,e){a||
(a=this);this.parent=a;this.F=a.F;this.Ka=k;this.id=B.Jd++;this.name=b;this.mode=c;this.n={};this.p={};this.ob=e},B.Va.prototype={},Object.defineProperties(B.Va.prototype,{M:{get:function(){return 365===(this.mode&365)},set:function(a){a?this.mode|=365:this.mode&=-366}},write:{get:function(){return 146===(this.mode&146)},set:function(a){a?this.mode|=146:this.mode&=-147}},Dd:{get:function(){return B.J(this.mode)}},Gb:{get:function(){return B.ib(this.mode)}}}));a=new B.Va(a,b,c,e);B.tc(a);return a},
zb:function(a){B.uc(a)},jb:function(a){return a===a.parent},ka:function(a){return!!a.Ka},isFile:function(a){return 32768===(a&61440)},J:function(a){return 16384===(a&61440)},Ia:function(a){return 40960===(a&61440)},ib:function(a){return 8192===(a&61440)},Bd:function(a){return 24576===(a&61440)},Cd:function(a){return 4096===(a&61440)},Ed:function(a){return 49152===(a&49152)},rd:{r:0,rs:1052672,"r+":2,w:577,wx:705,xw:705,"w+":578,"wx+":706,"xw+":706,a:1089,ax:1217,xa:1217,"a+":1090,"ax+":1218,"xa+":1218},
wc:function(a){var b=B.rd[a];"undefined"===typeof b&&d(Error("Unknown file open mode: "+a));return b},sd:function(a){var b=["r","w","rw"][a&2097155];a&512&&(b+="w");return b},na:function(a,b){return B.vc?0:-1!==b.indexOf("r")&&!(a.mode&292)||-1!==b.indexOf("w")&&!(a.mode&146)||-1!==b.indexOf("x")&&!(a.mode&73)?U.qb:0},Gd:function(a){var b=B.na(a,"x");return b?b:!a.n.ra?U.qb:0},Jb:function(a,b){try{return B.aa(a,b),U.Xb}catch(c){}return B.na(a,"wx")},kb:function(a,b,c){var e;try{e=B.aa(a,b)}catch(f){return f.cb}if(a=
B.na(a,"wx"))return a;if(c){if(!B.J(e.mode))return U.Sa;if(B.jb(e)||B.da(e)===B.yb())return U.ga}else if(B.J(e.mode))return U.pa;return 0},Hd:function(a,b){return!a?U.Q:B.Ia(a.mode)?U.rb:B.J(a.mode)&&(0!==(b&2097155)||b&512)?U.pa:B.na(a,B.sd(b))},Qc:4096,Kd:function(a,b){for(var b=b||B.Qc,c=a||0;c<=b;c++)if(!B.oa[c])return c;d(new B.e(U.Lc))},qa:function(a){return B.oa[a]},fc:function(a,b,c){B.Wa||(B.Wa=n(),B.Wa.prototype={},Object.defineProperties(B.Wa.prototype,{object:{get:function(){return this.g},
set:function(a){this.g=a}},yg:{get:function(){return 1!==(this.D&2097155)}},zg:{get:function(){return 0!==(this.D&2097155)}},xg:{get:function(){return this.D&1024}}}));var e=new B.Wa,f;for(f in a)e[f]=a[f];a=e;b=B.Kd(b,c);a.C=b;return B.oa[b]=a},dd:function(a){B.oa[a]=k},pc:function(a){return B.oa[a-1]},Eb:function(a){return a?a.C+1:0},bd:{open:function(a){a.p=B.td(a.g.ob).p;a.p.open&&a.p.open(a)},$:function(){d(new B.e(U.Ua))}},Ib:function(a){return a>>8},Gg:function(a){return a&255},la:function(a,
b){return a<<8|b},Ob:function(a,b){B.ic[a]={p:b}},td:function(a){return B.ic[a]},nc:function(a){for(var b=[],a=[a];a.length;){var c=a.pop();b.push(c);a.push.apply(a,c.La)}return b},Fc:function(a,b){function c(a){if(a){if(!c.pd)return c.pd=i,b(a)}else++f>=e.length&&b(k)}"function"===typeof a&&(b=a,a=m);var e=B.nc(B.root.F),f=0;e.forEach(function(b){if(!b.type.Fc)return c(k);b.type.Fc(b,a,c)})},F:function(a,b,c){var e="/"===c,f=!c,h;e&&B.root&&d(new B.e(U.ga));!e&&!f&&(h=B.u(c,{Bb:m}),c=h.path,h=h.g,
B.ka(h)&&d(new B.e(U.ga)),B.J(h.mode)||d(new B.e(U.Sa)));b={type:a,Kg:b,Id:c,La:[]};a=a.F(b);a.F=b;b.root=a;e?B.root=a:h&&(h.Ka=b,h.F&&h.F.La.push(b));return a},Qg:function(a){a=B.u(a,{Bb:m});B.ka(a.g)||d(new B.e(U.B));var a=a.g,b=a.Ka,c=B.nc(b);Object.keys(B.T).forEach(function(a){for(a=B.T[a];a;){var b=a.ma;-1!==c.indexOf(a.F)&&B.zb(a);a=b}});a.Ka=k;b=a.F.La.indexOf(b);w(-1!==b);a.F.La.splice(b,1)},ra:function(a,b){return a.n.ra(a,b)},ba:function(a,b,c){var e=B.u(a,{parent:i}).g,a=W(a);(!a||"."===
a||".."===a)&&d(new B.e(U.B));var f=B.Jb(e,a);f&&d(new B.e(f));e.n.ba||d(new B.e(U.O));return e.n.ba(e,a,b,c)},create:function(a,b){b=(b!==g?b:438)&4095;b|=32768;return B.ba(a,b,0)},ea:function(a,b){b=(b!==g?b:511)&1023;b|=16384;return B.ba(a,b,0)},lb:function(a,b,c){"undefined"===typeof c&&(c=b,b=438);return B.ba(a,b|8192,c)},ca:function(a,b){gb(a)||d(new B.e(U.Q));var c=B.u(b,{parent:i}).g;c||d(new B.e(U.Q));var e=W(b),f=B.Jb(c,e);f&&d(new B.e(f));c.n.ca||d(new B.e(U.O));return c.n.ca(c,e,a)},rename:function(a,
b){var c=eb(a),e=eb(b),f=W(a),h=W(b),j,l,u;try{j=B.u(a,{parent:i}),l=j.g,j=B.u(b,{parent:i}),u=j.g}catch(q){d(new B.e(U.ga))}(!l||!u)&&d(new B.e(U.Q));l.F!==u.F&&d(new B.e(U.Oc));j=B.aa(l,f);e=hb(a,e);"."!==e.charAt(0)&&d(new B.e(U.B));e=hb(b,c);"."!==e.charAt(0)&&d(new B.e(U.sb));var x;try{x=B.aa(u,h)}catch(s){}if(j!==x){c=B.J(j.mode);(f=B.kb(l,f,c))&&d(new B.e(f));(f=x?B.kb(u,h,c):B.Jb(u,h))&&d(new B.e(f));l.n.rename||d(new B.e(U.O));(B.ka(j)||x&&B.ka(x))&&d(new B.e(U.ga));u!==l&&(f=B.na(l,"w"))&&
d(new B.e(f));try{B.H.willMovePath&&B.H.willMovePath(a,b)}catch(v){console.log("FS.trackingDelegate['willMovePath']('"+a+"', '"+b+"') threw an exception: "+v.message)}B.uc(j);try{l.n.rename(j,u,h)}catch(G){d(G)}finally{B.tc(j)}try{if(B.H.onMovePath)B.H.onMovePath(a,b)}catch(ua){console.log("FS.trackingDelegate['onMovePath']('"+a+"', '"+b+"') threw an exception: "+ua.message)}}},Oa:function(a){var b=B.u(a,{parent:i}).g,c=W(a),e=B.aa(b,c),f=B.kb(b,c,i);f&&d(new B.e(f));b.n.Oa||d(new B.e(U.O));B.ka(e)&&
d(new B.e(U.ga));try{B.H.willDeletePath&&B.H.willDeletePath(a)}catch(h){console.log("FS.trackingDelegate['willDeletePath']('"+a+"') threw an exception: "+h.message)}b.n.Oa(b,c);B.zb(e);try{if(B.H.onDeletePath)B.H.onDeletePath(a)}catch(j){console.log("FS.trackingDelegate['onDeletePath']('"+a+"') threw an exception: "+j.message)}},Na:function(a){a=B.u(a,{R:i}).g;a.n.Na||d(new B.e(U.Sa));return a.n.Na(a)},za:function(a){var b=B.u(a,{parent:i}).g,c=W(a),e=B.aa(b,c),f=B.kb(b,c,m);f&&(f===U.pa&&(f=U.O),
d(new B.e(f)));b.n.za||d(new B.e(U.O));B.ka(e)&&d(new B.e(U.ga));try{B.H.willDeletePath&&B.H.willDeletePath(a)}catch(h){console.log("FS.trackingDelegate['willDeletePath']('"+a+"') threw an exception: "+h.message)}b.n.za(b,c);B.zb(e);try{if(B.H.onDeletePath)B.H.onDeletePath(a)}catch(j){console.log("FS.trackingDelegate['onDeletePath']('"+a+"') threw an exception: "+j.message)}},ta:function(a){(a=B.u(a).g)||d(new B.e(U.Q));a.n.ta||d(new B.e(U.B));return a.n.ta(a)},Dc:function(a,b){var c=B.u(a,{R:!b}).g;
c||d(new B.e(U.Q));c.n.S||d(new B.e(U.O));return c.n.S(c)},Eg:function(a){return B.Dc(a,i)},Ya:function(a,b,c){a="string"===typeof a?B.u(a,{R:!c}).g:a;a.n.I||d(new B.e(U.O));a.n.I(a,{mode:b&4095|a.mode&-4096,timestamp:Date.now()})},Bg:function(a,b){B.Ya(a,b,i)},jg:function(a,b){var c=B.qa(a);c||d(new B.e(U.V));B.Ya(c.g,b)},dc:function(a,b,c,e){a="string"===typeof a?B.u(a,{R:!e}).g:a;a.n.I||d(new B.e(U.O));a.n.I(a,{timestamp:Date.now()})},Cg:function(a,b,c){B.dc(a,b,c,i)},kg:function(a,b,c){(a=B.qa(a))||
d(new B.e(U.V));B.dc(a.g,b,c)},truncate:function(a,b){0>b&&d(new B.e(U.B));var c;c="string"===typeof a?B.u(a,{R:i}).g:a;c.n.I||d(new B.e(U.O));B.J(c.mode)&&d(new B.e(U.pa));B.isFile(c.mode)||d(new B.e(U.B));var e=B.na(c,"w");e&&d(new B.e(e));c.n.I(c,{size:b,timestamp:Date.now()})},mg:function(a,b){var c=B.qa(a);c||d(new B.e(U.V));0===(c.D&2097155)&&d(new B.e(U.B));B.truncate(c.g,b)},Rg:function(a,b,c){a=B.u(a,{R:i}).g;a.n.I(a,{timestamp:Math.max(b,c)})},open:function(a,b,c,e,f){""===a&&d(new B.e(U.Q));
var b="string"===typeof b?B.wc(b):b,c=b&64?("undefined"===typeof c?438:c)&4095|32768:0,h;if("object"===typeof a)h=a;else{a=db(a);try{h=B.u(a,{R:!(b&131072)}).g}catch(j){}}var l=m;b&64&&(h?b&128&&d(new B.e(U.Xb)):(h=B.ba(a,c,0),l=i));h||d(new B.e(U.Q));B.ib(h.mode)&&(b&=-513);l||(c=B.Hd(h,b))&&d(new B.e(c));b&512&&B.truncate(h,0);b&=-641;e=B.fc({g:h,path:B.da(h),D:b,seekable:i,position:0,p:h.p,$d:[],error:m},e,f);e.p.open&&e.p.open(e);p.logReadFiles&&!(b&1)&&(B.Mb||(B.Mb={}),a in B.Mb||(B.Mb[a]=1,
p.printErr("read file: "+a)));try{B.H.onOpenFile&&(f=0,1!==(b&2097155)&&(f|=B.Gc.yc.Rc),0!==(b&2097155)&&(f|=B.Gc.yc.Sc),B.H.onOpenFile(a,f))}catch(u){console.log("FS.trackingDelegate['onOpenFile']('"+a+"', flags) threw an exception: "+u.message)}return e},close:function(a){try{a.p.close&&a.p.close(a)}catch(b){d(b)}finally{B.dd(a.C)}},$:function(a,b,c){(!a.seekable||!a.p.$)&&d(new B.e(U.Ua));a.position=a.p.$(a,b,c);a.$d=[];return a.position},M:function(a,b,c,e,f){(0>e||0>f)&&d(new B.e(U.B));1===(a.D&
2097155)&&d(new B.e(U.V));B.J(a.g.mode)&&d(new B.e(U.pa));a.p.M||d(new B.e(U.B));var h=i;"undefined"===typeof f?(f=a.position,h=m):a.seekable||d(new B.e(U.Ua));b=a.p.M(a,b,c,e,f);h||(a.position+=b);return b},write:function(a,b,c,e,f,h){(0>e||0>f)&&d(new B.e(U.B));0===(a.D&2097155)&&d(new B.e(U.V));B.J(a.g.mode)&&d(new B.e(U.pa));a.p.write||d(new B.e(U.B));a.D&1024&&B.$(a,0,2);var j=i;"undefined"===typeof f?(f=a.position,j=m):a.seekable||d(new B.e(U.Ua));b=a.p.write(a,b,c,e,f,h);j||(a.position+=b);
try{if(a.path&&B.H.onWriteToFile)B.H.onWriteToFile(a.path)}catch(l){console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: "+l.message)}return b},Ea:function(a,b,c){(0>b||0>=c)&&d(new B.e(U.B));0===(a.D&2097155)&&d(new B.e(U.V));!B.isFile(a.g.mode)&&!B.J(node.mode)&&d(new B.e(U.Qa));a.p.Ea||d(new B.e(U.Ta));a.p.Ea(a,b,c)},Ja:function(a,b,c,e,f,h,j){1===(a.D&2097155)&&d(new B.e(U.qb));a.p.Ja||d(new B.e(U.Qa));return a.p.Ja(a,b,c,e,f,h,j)},Ha:function(a,b,c){a.p.Ha||d(new B.e(U.Nc));
return a.p.Ha(a,b,c)},Mg:function(a,b){b=b||{};b.D=b.D||"r";b.encoding=b.encoding||"binary";"utf8"!==b.encoding&&"binary"!==b.encoding&&d(Error('Invalid encoding type "'+b.encoding+'"'));var c,e=B.open(a,b.D),f=B.Dc(a).size,h=new Uint8Array(f);B.M(e,h,0,f,0);if("utf8"===b.encoding){c="";for(var j=new z.Da,l=0;l<f;l++)c+=j.nb(h[l])}else"binary"===b.encoding&&(c=h);B.close(e);return c},Sg:function(a,b,c){c=c||{};c.D=c.D||"w";c.encoding=c.encoding||"utf8";"utf8"!==c.encoding&&"binary"!==c.encoding&&
d(Error('Invalid encoding type "'+c.encoding+'"'));a=B.open(a,c.D,c.mode);"utf8"===c.encoding?(b=new Uint8Array((new z.Da).Ac(b)),B.write(a,b,0,b.length,0,c.ad)):"binary"===c.encoding&&B.write(a,b,0,b.length,0,c.ad);B.close(a)},yb:function(){return B.hc},bg:function(a){a=B.u(a,{R:i});B.J(a.g.mode)||d(new B.e(U.Sa));var b=B.na(a.g,"x");b&&d(new B.e(b));B.hc=a.path},fd:function(){B.ea("/tmp");B.ea("/home");B.ea("/home/web_user")},ed:function(){B.ea("/dev");B.Ob(B.la(1,3),{M:function(){return 0},write:function(){return 0}});
B.lb("/dev/null",B.la(1,3));jb(B.la(5,0),mb);jb(B.la(6,0),nb);B.lb("/dev/tty",B.la(5,0));B.lb("/dev/tty1",B.la(6,0));var a;if("undefined"!==typeof crypto){var b=new Uint8Array(1);a=function(){crypto.getRandomValues(b);return b[0]}}else a=t?function(){return require("crypto").randomBytes(1)[0]}:function(){return 256*Math.random()|0};B.X("/dev","random",a);B.X("/dev","urandom",a);B.ea("/dev/shm");B.ea("/dev/shm/tmp")},od:function(){p.stdin?B.X("/dev","stdin",p.stdin):B.ca("/dev/tty","/dev/stdin");p.stdout?
B.X("/dev","stdout",k,p.stdout):B.ca("/dev/tty","/dev/stdout");p.stderr?B.X("/dev","stderr",k,p.stderr):B.ca("/dev/tty1","/dev/stderr");var a=B.open("/dev/stdin","r");K[ob>>2]=B.Eb(a);w(0===a.C,"invalid handle for stdin ("+a.C+")");a=B.open("/dev/stdout","w");K[pb>>2]=B.Eb(a);w(1===a.C,"invalid handle for stdout ("+a.C+")");a=B.open("/dev/stderr","w");K[qb>>2]=B.Eb(a);w(2===a.C,"invalid handle for stderr ("+a.C+")")},jc:function(){B.e||(B.e=function(a,b){this.g=b;this.Xd=function(a){this.cb=a;for(var b in U)if(U[b]===
a){this.code=b;break}};this.Xd(a);this.message=ab[a]},B.e.prototype=Error(),[U.Q].forEach(function(a){B.Db[a]=new B.e(a);B.Db[a].stack="<generic error, no stack>"}))},Zd:function(){B.jc();B.T=Array(4096);B.F(Y,{},"/");B.fd();B.ed()},Ga:function(a,b,c){w(!B.Ga.hb,"FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");B.Ga.hb=i;B.jc();p.stdin=a||p.stdin;p.stdout=b||p.stdout;p.stderr=
c||p.stderr;B.od()},Qd:function(){B.Ga.hb=m;for(var a=0;a<B.oa.length;a++){var b=B.oa[a];b&&B.close(b)}},fb:function(a,b){var c=0;a&&(c|=365);b&&(c|=146);return c},Ag:function(a,b){var c=fb.apply(k,a);b&&"/"==c[0]&&(c=c.substr(1));return c},Sf:function(a,b){return gb(b,a)},Pg:function(a){return db(a)},lg:function(a,b){var c=B.vb(a,b);if(c.Ab)return c.object;V(c.error);return k},vb:function(a,b){try{var c=B.u(a,{R:!b}),a=c.path}catch(e){}var f={jb:m,Ab:m,error:0,name:k,path:k,object:k,Md:m,Od:k,Nd:k};
try{c=B.u(a,{parent:i}),f.Md=i,f.Od=c.path,f.Nd=c.g,f.name=W(a),c=B.u(a,{R:!b}),f.Ab=i,f.path=c.path,f.object=c.g,f.name=c.g.name,f.jb="/"===c.path}catch(h){f.error=h.cb}return f},hd:function(a,b,c,e){a=X("string"===typeof a?a:B.da(a),b);return B.ea(a,B.fb(c,e))},ld:function(a,b){for(var a="string"===typeof a?a:B.da(a),c=b.split("/").reverse();c.length;){var e=c.pop();if(e){var f=X(a,e);try{B.ea(f)}catch(h){}a=f}}return f},gd:function(a,b,c,e,f){a=X("string"===typeof a?a:B.da(a),b);return B.create(a,
B.fb(e,f))},xb:function(a,b,c,e,f,h){a=b?X("string"===typeof a?a:B.da(a),b):a;e=B.fb(e,f);f=B.create(a,e);if(c){if("string"===typeof c){for(var a=Array(c.length),b=0,j=c.length;b<j;++b)a[b]=c.charCodeAt(b);c=a}B.Ya(f,e|146);a=B.open(f,"w");B.write(a,c,0,c.length,0,h);B.close(a);B.Ya(f,e)}return f},X:function(a,b,c,e){a=X("string"===typeof a?a:B.da(a),b);b=B.fb(!!c,!!e);B.X.Ib||(B.X.Ib=64);var f=B.la(B.X.Ib++,0);B.Ob(f,{open:function(a){a.seekable=m},close:function(){e&&(e.buffer&&e.buffer.length)&&
e(10)},M:function(a,b,e,f){for(var q=0,x=0;x<f;x++){var s;try{s=c()}catch(v){d(new B.e(U.ha))}s===g&&0===q&&d(new B.e(U.Ca));if(s===k||s===g)break;q++;b[e+x]=s}q&&(a.g.timestamp=Date.now());return q},write:function(a,b,c,f){for(var q=0;q<f;q++)try{e(b[c+q])}catch(x){d(new B.e(U.ha))}f&&(a.g.timestamp=Date.now());return q}});return B.lb(a,b,f)},kd:function(a,b,c){a=X("string"===typeof a?a:B.da(a),b);return B.ca(c,a)},mc:function(a){if(a.Gb||a.Dd||a.link||a.k)return i;var b=i;"undefined"!==typeof XMLHttpRequest&&
d(Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread."));if(p.read)try{a.k=Va(p.read(a.url),i),a.q=a.k.length}catch(c){b=m}else d(Error("Cannot load without read() or XMLHttpRequest."));b||V(U.ha);return b},jd:function(a,b,c,e,f){function h(){this.Hb=m;this.Za=[]}h.prototype.get=function(a){if(!(a>this.length-1||0>a)){var b=a%this.cd;return this.yd(a/
this.cd|0)[b]}};h.prototype.Wd=function(a){this.yd=a};h.prototype.bc=function(){var a=new XMLHttpRequest;a.open("HEAD",c,m);a.send(k);200<=a.status&&300>a.status||304===a.status||d(Error("Couldn't load "+c+". Status: "+a.status));var b=Number(a.getResponseHeader("Content-length")),e,f=1048576;if(!((e=a.getResponseHeader("Accept-Ranges"))&&"bytes"===e))f=b;var h=this;h.Wd(function(a){var e=a*f,j=(a+1)*f-1,j=Math.min(j,b-1);if("undefined"===typeof h.Za[a]){var l=h.Za;e>j&&d(Error("invalid range ("+
e+", "+j+") or no bytes requested!"));j>b-1&&d(Error("only "+b+" bytes available! programmer error!"));var q=new XMLHttpRequest;q.open("GET",c,m);b!==f&&q.setRequestHeader("Range","bytes="+e+"-"+j);"undefined"!=typeof Uint8Array&&(q.responseType="arraybuffer");q.overrideMimeType&&q.overrideMimeType("text/plain; charset=x-user-defined");q.send(k);200<=q.status&&300>q.status||304===q.status||d(Error("Couldn't load "+c+". Status: "+q.status));e=q.response!==g?new Uint8Array(q.response||[]):Va(q.responseText||
"",i);l[a]=e}"undefined"===typeof h.Za[a]&&d(Error("doXHR failed!"));return h.Za[a]});this.Uc=b;this.Tc=f;this.Hb=i};if("undefined"!==typeof XMLHttpRequest){ca||d("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var j=new h;Object.defineProperty(j,"length",{get:function(){this.Hb||this.bc();return this.Uc}});Object.defineProperty(j,"chunkSize",{get:function(){this.Hb||this.bc();return this.Tc}});j={Gb:m,k:j}}else j={Gb:m,url:c};
var l=B.gd(a,b,j,e,f);j.k?l.k=j.k:j.url&&(l.k=k,l.url=j.url);Object.defineProperty(l,"usedBytes",{get:function(){return this.k.length}});var u={};Object.keys(l.p).forEach(function(a){var b=l.p[a];u[a]=function(){B.mc(l)||d(new B.e(U.ha));return b.apply(k,arguments)}});u.M=function(a,b,c,e,f){B.mc(l)||d(new B.e(U.ha));a=a.g.k;if(f>=a.length)return 0;e=Math.min(a.length-f,e);w(0<=e);if(a.slice)for(var h=0;h<e;h++)b[c+h]=a[f+h];else for(h=0;h<e;h++)b[c+h]=a.get(f+h);return e};l.p=u;return l},md:function(a,
b,c,e,f,h,j,l,u){function q(){rb=document.pointerLockElement===v||document.mozPointerLockElement===v||document.webkitPointerLockElement===v||document.msPointerLockElement===v}function x(c){function q(c){l||B.xb(a,b,c,e,f,u);h&&h();Za()}var s=m;p.preloadPlugins.forEach(function(a){!s&&a.canHandle(G)&&(a.handle(c,G,q,function(){j&&j();Za()}),s=i)});s||q(c)}p.preloadPlugins||(p.preloadPlugins=[]);if(!tb){tb=i;try{new Blob,ub=i}catch(s){ub=m,console.log("warning: no blob constructor, cannot create blobs with mimetypes")}vb=
"undefined"!=typeof MozBlobBuilder?MozBlobBuilder:"undefined"!=typeof WebKitBlobBuilder?WebKitBlobBuilder:!ub?console.log("warning: no BlobBuilder"):k;wb="undefined"!=typeof window?window.URL?window.URL:window.webkitURL:g;!p.xc&&"undefined"===typeof wb&&(console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available."),p.xc=i);p.preloadPlugins.push({canHandle:function(a){return!p.xc&&/\.(jpg|jpeg|png|bmp)$/i.test(a)},handle:function(a,b,
c,e){var f=k;if(ub)try{f=new Blob([a],{type:xb(b)}),f.size!==a.length&&(f=new Blob([(new Uint8Array(a)).buffer],{type:xb(b)}))}catch(h){z.Aa("Blob constructor present but fails: "+h+"; falling back to blob builder")}f||(f=new vb,f.append((new Uint8Array(a)).buffer),f=f.getBlob());var j=wb.createObjectURL(f),l=new Image;l.onload=function(){w(l.complete,"Image "+b+" could not be decoded");var e=document.createElement("canvas");e.width=l.width;e.height=l.height;e.getContext("2d").drawImage(l,0,0);p.preloadedImages[b]=
e;wb.revokeObjectURL(j);c&&c(a)};l.onerror=function(){console.log("Image "+j+" could not be decoded");e&&e()};l.src=j}});p.preloadPlugins.push({canHandle:function(a){return!p.Jg&&a.substr(-4)in{".ogg":1,".wav":1,".mp3":1}},handle:function(a,b,c,e){function f(e){j||(j=i,p.preloadedAudios[b]=e,c&&c(a))}function h(){j||(j=i,p.preloadedAudios[b]=new Audio,e&&e())}var j=m;if(ub){try{var l=new Blob([a],{type:xb(b)})}catch(q){return h()}var l=wb.createObjectURL(l),s=new Audio;s.addEventListener("canplaythrough",
function(){f(s)},m);s.onerror=function(){if(!j){console.log("warning: browser could not fully decode audio "+b+", trying slower base64 approach");for(var c="",e=0,h=0,l=0;l<a.length;l++){e=e<<8|a[l];for(h+=8;6<=h;)var q=e>>h-6&63,h=h-6,c=c+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[q]}2==h?(c+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(e&3)<<4],c+="=="):4==h&&(c+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(e&15)<<2],c+="=");
s.src="data:audio/x-"+b.substr(-3)+";base64,"+c;f(s)}};s.src=l;p.noExitRuntime=i;setTimeout(function(){H||f(s)},1E4)}else return h()}});var v=p.canvas;v&&(v.Pb=v.requestPointerLock||v.mozRequestPointerLock||v.webkitRequestPointerLock||v.msRequestPointerLock||n(),v.kc=document.exitPointerLock||document.mozExitPointerLock||document.webkitExitPointerLock||document.msExitPointerLock||n(),v.kc=v.kc.bind(document),document.addEventListener("pointerlockchange",q,m),document.addEventListener("mozpointerlockchange",
q,m),document.addEventListener("webkitpointerlockchange",q,m),document.addEventListener("mspointerlockchange",q,m),p.elementPointerLock&&v.addEventListener("click",function(a){!rb&&v.Pb&&(v.Pb(),a.preventDefault())},m))}var G=b?gb(X(a,b)):a;Ya();"string"==typeof c?yb(c,function(a){x(a)},j):x(c)},indexedDB:function(){return window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB},Ub:function(){return"EM_FS_"+window.location.pathname},Vb:20,Ba:"FILE_DATA",Og:function(a,b,c){var b=
b||n(),c=c||n(),e=B.indexedDB();try{var f=e.open(B.Ub(),B.Vb)}catch(h){return c(h)}f.Ld=function(){console.log("creating db");f.result.createObjectStore(B.Ba)};f.onsuccess=function(){var e=f.result.transaction([B.Ba],"readwrite"),h=e.objectStore(B.Ba),u=0,q=0,x=a.length;a.forEach(function(a){a=h.put(B.vb(a).object.k,a);a.onsuccess=function(){u++;u+q==x&&(0==q?b():c())};a.onerror=function(){q++;u+q==x&&(0==q?b():c())}});e.onerror=c};f.onerror=c},Dg:function(a,b,c){var b=b||n(),c=c||n(),e=B.indexedDB();
try{var f=e.open(B.Ub(),B.Vb)}catch(h){return c(h)}f.Ld=c;f.onsuccess=function(){var e=f.result;try{var h=e.transaction([B.Ba],"readonly")}catch(u){c(u);return}var q=h.objectStore(B.Ba),x=0,s=0,v=a.length;a.forEach(function(a){var e=q.get(a);e.onsuccess=function(){B.vb(a).Ab&&B.za(a);B.xb(eb(a),W(a),e.result,i,i,i);x++;x+s==v&&(0==s?b():c())};e.onerror=function(){s++;x+s==v&&(0==s?b():c())}});h.onerror=c};f.onerror=c}};function zb(){d("TODO")}
var Z={F:function(){p.websocket=p.websocket&&"object"===typeof p.websocket?p.websocket:{};p.websocket.tb={};p.websocket.on=function(a,b){"function"===typeof b&&(this.tb[a]=b);return this};p.websocket.P=function(a,b){"function"===typeof this.tb[a]&&this.tb[a].call(this,b)};return B.createNode(k,"/",16895,0)},nd:function(a,b,c){c&&w(1==b==(6==c));a={qd:a,type:b,protocol:c,G:k,error:k,Ma:{},Kb:[],ua:[],wa:Z.L};b=Z.mb();c=B.createNode(Z.root,b,49152,0);c.va=a;b=B.fc({path:b,g:c,D:B.wc("r+"),seekable:m,
p:Z.p});a.A=b;return a},wd:function(a){a=B.qa(a);return!a||!B.Ed(a.g.mode)?k:a.g.va},p:{zc:function(a){a=a.g.va;return a.wa.zc(a)},Ha:function(a,b,c){a=a.g.va;return a.wa.Ha(a,b,c)},M:function(a,b,c,e){a=a.g.va;e=a.wa.Rd(a,e);if(!e)return 0;b.set(e.buffer,c);return e.buffer.length},write:function(a,b,c,e){a=a.g.va;return a.wa.Vd(a,b,c,e)},close:function(a){a=a.g.va;a.wa.close(a)}},mb:function(){Z.mb.gc||(Z.mb.gc=0);return"socket["+Z.mb.gc++ +"]"},L:{$a:function(a,b,c){var e;"object"===typeof b&&(e=
b,c=b=k);if(e)e._socket?(b=e._socket.remoteAddress,c=e._socket.remotePort):((c=/ws[s]?:\/\/([^:]+):(\d+)/.exec(e.url))||d(Error("WebSocket URL must be in the format ws(s)://address:port")),b=c[1],c=parseInt(c[2],10));else try{var f=p.websocket&&"object"===typeof p.websocket,h="ws:#".replace("#","//");f&&"string"===typeof p.websocket.url&&(h=p.websocket.url);if("ws://"===h||"wss://"===h)var j=b.split("/"),h=h+j[0]+":"+c+"/"+j.slice(1).join("/");j="binary";f&&"string"===typeof p.websocket.subprotocol&&
(j=p.websocket.subprotocol);var j=j.replace(/^ +| +$/g,"").split(/ *, */),l=t?{protocol:j.toString()}:j;e=new (t?require("ws"):window.WebSocket)(h,l);e.binaryType="arraybuffer"}catch(u){d(new B.e(U.Yb))}b={W:b,port:c,o:e,ab:[]};Z.L.$b(a,b);Z.L.zd(a,b);2===a.type&&"undefined"!==typeof a.ya&&b.ab.push(new Uint8Array([255,255,255,255,112,111,114,116,(a.ya&65280)>>8,a.ya&255]));return b},gb:function(a,b,c){return a.Ma[b+":"+c]},$b:function(a,b){a.Ma[b.W+":"+b.port]=b},Bc:function(a,b){delete a.Ma[b.W+
":"+b.port]},zd:function(a,b){function c(){p.websocket.P("open",a.A.C);try{for(var c=b.ab.shift();c;)b.o.send(c),c=b.ab.shift()}catch(e){b.o.close()}}function e(c){w("string"!==typeof c&&c.byteLength!==g);var c=new Uint8Array(c),e=f;f=m;e&&10===c.length&&255===c[0]&&255===c[1]&&255===c[2]&&255===c[3]&&112===c[4]&&111===c[5]&&114===c[6]&&116===c[7]?(c=c[8]<<8|c[9],Z.L.Bc(a,b),b.port=c,Z.L.$b(a,b)):(a.ua.push({W:b.W,port:b.port,data:c}),p.websocket.P("message",a.A.C))}var f=i;t?(b.o.on("open",c),b.o.on("message",
function(a,b){b.binary&&e((new Uint8Array(a)).buffer)}),b.o.on("close",function(){p.websocket.P("close",a.A.C)}),b.o.on("error",function(){a.error=U.Wb;p.websocket.P("error",[a.A.C,a.error,"ECONNREFUSED: Connection refused"])})):(b.o.onopen=c,b.o.onclose=function(){p.websocket.P("close",a.A.C)},b.o.onmessage=function(a){e(a.data)},b.o.onerror=function(){a.error=U.Wb;p.websocket.P("error",[a.A.C,a.error,"ECONNREFUSED: Connection refused"])})},zc:function(a){if(1===a.type&&a.G)return a.Kb.length?65:
0;var b=0,c=1===a.type?Z.L.gb(a,a.Y,a.Z):k;if(a.ua.length||!c||c&&c.o.readyState===c.o.Pa||c&&c.o.readyState===c.o.CLOSED)b|=65;if(!c||c&&c.o.readyState===c.o.OPEN)b|=4;if(c&&c.o.readyState===c.o.Pa||c&&c.o.readyState===c.o.CLOSED)b|=16;return b},Ha:function(a,b,c){switch(b){case 21531:return b=0,a.ua.length&&(b=a.ua[0].data.length),K[c>>2]=b,0;default:return U.B}},close:function(a){if(a.G){try{a.G.close()}catch(b){}a.G=k}for(var c=Object.keys(a.Ma),e=0;e<c.length;e++){var f=a.Ma[c[e]];try{f.o.close()}catch(h){}Z.L.Bc(a,
f)}return 0},bind:function(a,b,c){("undefined"!==typeof a.Qb||"undefined"!==typeof a.ya)&&d(new B.e(U.B));a.Qb=b;a.ya=c||zb();if(2===a.type){a.G&&(a.G.close(),a.G=k);try{a.wa.Fd(a,0)}catch(e){e instanceof B.e||d(e),e.cb!==U.Ta&&d(e)}}},cg:function(a,b,c){a.G&&d(new B.e(U.Ta));if("undefined"!==typeof a.Y&&"undefined"!==typeof a.Z){var e=Z.L.gb(a,a.Y,a.Z);e&&(e.o.readyState===e.o.CONNECTING&&d(new B.e(U.Hc)),d(new B.e(U.Kc)))}b=Z.L.$a(a,b,c);a.Y=b.W;a.Z=b.port;d(new B.e(U.Jc))},Fd:function(a){t||d(new B.e(U.Ta));
a.G&&d(new B.e(U.B));var b=require("ws").Server;a.G=new b({host:a.Qb,port:a.ya});p.websocket.P("listen",a.A.C);a.G.on("connection",function(b){if(1===a.type){var e=Z.nd(a.qd,a.type,a.protocol),b=Z.L.$a(e,b);e.Y=b.W;e.Z=b.port;a.Kb.push(e);p.websocket.P("connection",e.A.C)}else Z.L.$a(a,b),p.websocket.P("connection",a.A.C)});a.G.on("closed",function(){p.websocket.P("close",a.A.C);a.G=k});a.G.on("error",function(){a.error=U.Yb;p.websocket.P("error",[a.A.C,a.error,"EHOSTUNREACH: Host is unreachable"])})},
accept:function(a){a.G||d(new B.e(U.B));var b=a.Kb.shift();b.A.D=a.A.D;return b},tg:function(a,b){var c,e;b?((a.Y===g||a.Z===g)&&d(new B.e(U.Ra)),c=a.Y,e=a.Z):(c=a.Qb||0,e=a.ya||0);return{W:c,port:e}},Vd:function(a,b,c,e,f,h){if(2===a.type){if(f===g||h===g)f=a.Y,h=a.Z;(f===g||h===g)&&d(new B.e(U.Ic))}else f=a.Y,h=a.Z;var j=Z.L.gb(a,f,h);1===a.type&&((!j||j.o.readyState===j.o.Pa||j.o.readyState===j.o.CLOSED)&&d(new B.e(U.Ra)),j.o.readyState===j.o.CONNECTING&&d(new B.e(U.Ca)));b=b instanceof Array||
b instanceof ArrayBuffer?b.slice(c,c+e):b.buffer.slice(b.byteOffset+c,b.byteOffset+c+e);if(2===a.type&&(!j||j.o.readyState!==j.o.OPEN)){if(!j||j.o.readyState===j.o.Pa||j.o.readyState===j.o.CLOSED)j=Z.L.$a(a,f,h);j.ab.push(b);return e}try{return j.o.send(b),e}catch(l){d(new B.e(U.B))}},Rd:function(a,b){1===a.type&&a.G&&d(new B.e(U.Ra));var c=a.ua.shift();if(!c){if(1===a.type){var e=Z.L.gb(a,a.Y,a.Z);if(e){if(e.o.readyState===e.o.Pa||e.o.readyState===e.o.CLOSED)return k;d(new B.e(U.Ca))}d(new B.e(U.Ra))}d(new B.e(U.Ca))}var e=
c.data.byteLength||c.data.length,f=c.data.byteOffset||0,h=c.data.buffer||c.data,j=Math.min(b,e),l={buffer:new Uint8Array(h,f,j),W:c.W,port:c.port};1===a.type&&j<e&&(c.data=new Uint8Array(h,f+j,e-j),a.ua.unshift(c));return l}}};function Ab(a,b,c){a=B.qa(a);if(!a)return V(U.V),-1;try{return B.write(a,I,b,c)}catch(e){return B.sc(e),-1}}p._strlen=Bb;function Cb(a){a=B.pc(a);return!a?-1:a.C}function Db(a,b){return Ab(Cb(b),a,Bb(a))}
function Eb(a,b){var c;c=a&255;c=0<=c?c:Math.pow(2,g)+c;I[Eb.Cc>>0]=c;if(-1==Ab(Cb(b),Eb.Cc,1)){if(c=B.pc(b))c.error=i;return-1}return c}function Fb(a){Fb.$c||(E=E+4095&-4096,Fb.$c=i,w(z.bb),Fb.Wc=z.bb,z.bb=function(){A("cannot dynamically allocate, sbrk now has control")});var b=E;0!=a&&Fb.Wc(a);return b}p._memset=Gb;function Hb(a,b,c){window._broadwayOnPictureDecoded(a,b,c)}p._broadwayOnPictureDecoded=Hb;function Ib(){window._broadwayOnHeadersDecoded()}p._broadwayOnHeadersDecoded=Ib;
function Jb(a,b){Kb=a;Lb=b;if(!Mb)return 1;0==a?(Nb=function(){setTimeout(Ob,b)},Pb="timeout"):1==a&&(Nb=function(){Qb(Ob)},Pb="rAF");return 0}
function Rb(a,b,c,e){p.noExitRuntime=i;w(!Mb,"emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");Mb=a;Sb=e;var f=Tb;Ob=function(){if(!H)if(0<Ub.length){var b=Date.now(),c=Ub.shift();c.ja(c.Xa);if(Vb){var l=Vb,u=0==l%1?l-1:Math.floor(l);Vb=c.dg?u:(8*l+(u+0.5))/9}console.log('main loop blocker "'+c.name+'" took '+(Date.now()-b)+" ms");p.setStatus&&(b=p.statusMessage||
"Please wait...",c=Vb,l=Wb.ig,c?c<l?p.setStatus(b+" ("+(l-c)+"/"+l+")"):p.setStatus(b):p.setStatus(""));setTimeout(Ob,0)}else if(!(f<Tb))if(Xb=Xb+1|0,1==Kb&&1<Lb&&0!=Xb%Lb)Nb();else{"timeout"===Pb&&p.fg&&(p.fa("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!"),Pb="");a:if(!H&&!(p.preMainLoop&&p.preMainLoop()===m)){try{"undefined"!==
typeof e?z.Fa("vi",a,[e]):z.Fa("v",a)}catch(q){if(q instanceof ia)break a;q&&("object"===typeof q&&q.stack)&&p.fa("exception thrown: "+[q,q.stack]);d(q)}p.postMainLoop&&p.postMainLoop()}f<Tb||("object"===typeof SDL&&(SDL.ac&&SDL.ac.Pd)&&SDL.ac.Pd(),Nb())}};b&&0<b?Jb(0,1E3/b):Jb(1,1);Nb();c&&d("SimulateInfiniteLoop")}var Nb=k,Pb="",Tb=0,Mb=k,Sb=0,Kb=0,Lb=0,Xb=0,Ub=[],Wb={},Ob,Vb,Yb=m,rb=m,Zb=m,$b=g,ac=g,bc=0;
function cc(a){var b=Date.now();if(0===bc)bc=b+1E3/60;else for(;b+2>=bc;)bc+=1E3/60;b=Math.max(bc-b,0);setTimeout(a,b)}function Qb(a){"undefined"===typeof window?cc(a):(window.requestAnimationFrame||(window.requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame||window.oRequestAnimationFrame||cc),window.requestAnimationFrame(a))}
function xb(a){return{jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",bmp:"image/bmp",ogg:"audio/ogg",wav:"audio/wav",mp3:"audio/mpeg"}[a.substr(a.lastIndexOf(".")+1)]}
function yb(a,b,c){function e(){c?c():d('Loading data file "'+a+'" failed.')}var f=new XMLHttpRequest;f.open("GET",a,i);f.responseType="arraybuffer";f.onload=function(){if(200==f.status||0==f.status&&f.response){var c=f.response;w(c,'Loading data file "'+a+'" failed (no arrayBuffer).');b(new Uint8Array(c));Za()}else e()};f.onerror=e;f.send(k);Ya()}var dc=[];function ec(){var a=p.canvas;dc.forEach(function(b){b(a.width,a.height)})}
function fc(a,b,c){b&&c?(a.ae=b,a.Ad=c):(b=a.ae,c=a.Ad);var e=b,f=c;p.forcedAspectRatio&&0<p.forcedAspectRatio&&(e/f<p.forcedAspectRatio?e=Math.round(f*p.forcedAspectRatio):f=Math.round(e/p.forcedAspectRatio));if((document.webkitFullScreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.mozFullscreenElement||document.fullScreenElement||document.fullscreenElement||document.msFullScreenElement||document.msFullscreenElement||document.webkitCurrentFullScreenElement)===
a.parentNode&&"undefined"!=typeof screen)var h=Math.min(screen.width/e,screen.height/f),e=Math.round(e*h),f=Math.round(f*h);ac?(a.width!=e&&(a.width=e),a.height!=f&&(a.height=f),"undefined"!=typeof a.style&&(a.style.removeProperty("width"),a.style.removeProperty("height"))):(a.width!=b&&(a.width=b),a.height!=c&&(a.height=c),"undefined"!=typeof a.style&&(e!=b||f!=c?(a.style.setProperty("width",e+"px","important"),a.style.setProperty("height",f+"px","important")):(a.style.removeProperty("width"),a.style.removeProperty("height"))))}
var tb,ub,vb,wb;p._memcpy=gc;B.Zd();R.unshift({ja:function(){!p.noFSInit&&!B.Ga.hb&&B.Ga()}});Pa.push({ja:function(){B.vc=m}});Qa.push({ja:function(){B.Qd()}});p.FS_createFolder=B.hd;p.FS_createPath=B.ld;p.FS_createDataFile=B.xb;p.FS_createPreloadedFile=B.md;p.FS_createLazyFile=B.jd;p.FS_createLink=B.kd;p.FS_createDevice=B.X;bb=z.Ec(4);K[bb>>2]=0;R.unshift({ja:n()});Qa.push({ja:n()});var lb=new z.Da;t&&(require("fs"),process.platform.match(/^win/));R.push({ja:function(){Z.root=B.F(Z,{},k)}});
Eb.Cc=M([0],"i8",L);
p.requestFullScreen=function(a,b){function c(){Yb=m;var a=e.parentNode;(document.webkitFullScreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.mozFullscreenElement||document.fullScreenElement||document.fullscreenElement||document.msFullScreenElement||document.msFullscreenElement||document.webkitCurrentFullScreenElement)===a?(e.cc=document.cancelFullScreen||document.mozCancelFullScreen||document.webkitCancelFullScreen||document.msExitFullscreen||document.exitFullscreen||
n(),e.cc=e.cc.bind(document),$b&&e.Pb(),Yb=i,ac&&("undefined"!=typeof SDL&&(a=Ha[SDL.screen+0*z.ia>>2],K[SDL.screen+0*z.ia>>2]=a|8388608),ec())):(a.parentNode.insertBefore(e,a),a.parentNode.removeChild(a),ac&&("undefined"!=typeof SDL&&(a=Ha[SDL.screen+0*z.ia>>2],K[SDL.screen+0*z.ia>>2]=a&-8388609),ec()));if(p.onFullScreen)p.onFullScreen(Yb);fc(e)}$b=a;ac=b;"undefined"===typeof $b&&($b=i);"undefined"===typeof ac&&(ac=m);var e=p.canvas;Zb||(Zb=i,document.addEventListener("fullscreenchange",c,m),document.addEventListener("mozfullscreenchange",
c,m),document.addEventListener("webkitfullscreenchange",c,m),document.addEventListener("MSFullscreenChange",c,m));var f=document.createElement("div");e.parentNode.insertBefore(f,e);f.appendChild(e);f.Td=f.requestFullScreen||f.mozRequestFullScreen||f.msRequestFullscreen||(f.webkitRequestFullScreen?function(){f.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT)}:k);f.Td()};p.requestAnimationFrame=function(a){Qb(a)};p.setCanvasSize=function(a,b,c){fc(p.canvas,a,b);c||ec()};
p.pauseMainLoop=function(){Nb=k;Tb++};p.resumeMainLoop=function(){Tb++;var a=Kb,b=Lb,c=Mb;Mb=k;Rb(c,0,m,Sb);Jb(a,b)};p.getUserMedia=function(){window.qc||(window.qc=navigator.getUserMedia||navigator.mozGetUserMedia);window.qc(g)};Ja=y=z.ub(D);Ka=Ja+Ma;La=E=z.ub(Ka);w(La<F,"TOTAL_MEMORY not big enough for stack");p.Xc={Math:Math,Int8Array:Int8Array,Int16Array:Int16Array,Int32Array:Int32Array,Uint8Array:Uint8Array,Uint16Array:Uint16Array,Uint32Array:Uint32Array,Float32Array:Float32Array,Float64Array:Float64Array};
p.Yc={abort:A,assert:w,min:va,invoke_viiiii:function(a,b,c,e,f,h){try{p.dynCall_viiiii(a,b,c,e,f,h)}catch(j){"number"!==typeof j&&"longjmp"!==j&&d(j),$.setThrew(1,0)}},_broadwayOnPictureDecoded:Hb,_puts:function(a){var b=K[pb>>2],a=Db(a,b);return 0>a?a:0>Eb(10,b)?-1:a+1},_fflush:n(),_fputc:Eb,_send:function(a,b,c){return!Z.wd(a)?(V(U.V),-1):Ab(a,b,c)},_pwrite:function(a,b,c,e){a=B.qa(a);if(!a)return V(U.V),-1;try{return B.write(a,I,b,c,e)}catch(f){return B.sc(f),-1}},_fputs:Db,_emscripten_set_main_loop:Rb,
_abort:function(){p.abort()},___setErrNo:V,_sbrk:Fb,_mkport:zb,_emscripten_set_main_loop_timing:Jb,_emscripten_memcpy_big:function(a,b,c){N.set(N.subarray(b,b+c),a);return a},_fileno:Cb,_broadwayOnHeadersDecoded:Ib,_write:Ab,_time:function(a){var b=Date.now()/1E3|0;a&&(K[a>>2]=b);return b},_sysconf:function(a){switch(a){case 30:return 4096;case 132:case 133:case 12:case 137:case 138:case 15:case 235:case 16:case 17:case 18:case 19:case 20:case 149:case 13:case 10:case 236:case 153:case 9:case 21:case 22:case 159:case 154:case 14:case 77:case 78:case 139:case 80:case 81:case 79:case 82:case 68:case 67:case 164:case 11:case 29:case 47:case 48:case 95:case 52:case 51:case 46:return 200809;
case 27:case 246:case 127:case 128:case 23:case 24:case 160:case 161:case 181:case 182:case 242:case 183:case 184:case 243:case 244:case 245:case 165:case 178:case 179:case 49:case 50:case 168:case 169:case 175:case 170:case 171:case 172:case 97:case 76:case 32:case 173:case 35:return-1;case 176:case 177:case 7:case 155:case 8:case 157:case 125:case 126:case 92:case 93:case 129:case 130:case 131:case 94:case 91:return 1;case 74:case 60:case 69:case 70:case 4:return 1024;case 31:case 42:case 72:return 32;
case 87:case 26:case 33:return 2147483647;case 34:case 1:return 47839;case 38:case 36:return 99;case 43:case 37:return 2048;case 0:return 2097152;case 3:return 65536;case 28:return 32768;case 44:return 32767;case 75:return 16384;case 39:return 1E3;case 89:return 700;case 71:return 256;case 40:return 255;case 2:return 100;case 180:return 64;case 25:return 20;case 5:return 16;case 6:return 6;case 73:return 4;case 84:return"object"===typeof navigator?navigator.hardwareConcurrency||1:1}V(U.B);return-1},
___errno_location:function(){return bb},STACKTOP:y,STACK_MAX:Ka,tempDoublePtr:$a,ABORT:H,NaN:NaN,Infinity:Infinity};// EMSCRIPTEN_START_ASM
var $=(function(global,env,buffer) {
"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=0;var n=0;var o=0;var p=0;var q=+env.NaN,r=+env.Infinity;var s=0,t=0,u=0,v=0,w=0.0,x=0,y=0,z=0,A=0.0;var B=0;var C=0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=global.Math.floor;var M=global.Math.abs;var N=global.Math.sqrt;var O=global.Math.pow;var P=global.Math.cos;var Q=global.Math.sin;var R=global.Math.tan;var S=global.Math.acos;var T=global.Math.asin;var U=global.Math.atan;var V=global.Math.atan2;var W=global.Math.exp;var X=global.Math.log;var Y=global.Math.ceil;var Z=global.Math.imul;var _=env.abort;var $=env.assert;var aa=env.min;var ba=env.invoke_viiiii;var ca=env._broadwayOnPictureDecoded;var da=env._puts;var ea=env._fflush;var fa=env._fputc;var ga=env._send;var ha=env._pwrite;var ia=env._fputs;var ja=env._emscripten_set_main_loop;var ka=env._abort;var la=env.___setErrNo;var ma=env._sbrk;var na=env._mkport;var oa=env._emscripten_set_main_loop_timing;var pa=env._emscripten_memcpy_big;var qa=env._fileno;var ra=env._broadwayOnHeadersDecoded;var sa=env._write;var ta=env._time;var ua=env._sysconf;var va=env.___errno_location;var wa=0.0;
// EMSCRIPTEN_START_FUNCS
function ya(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+15&-16;return b|0}function za(){return i|0}function Aa(a){a=a|0;i=a}function Ba(a,b){a=a|0;b=b|0;if(!m){m=a;n=b}}function Ca(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0]}function Da(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0];a[k+4>>0]=a[b+4>>0];a[k+5>>0]=a[b+5>>0];a[k+6>>0]=a[b+6>>0];a[k+7>>0]=a[b+7>>0]}function Ea(a){a=a|0;B=a}function Fa(){return B|0}function Ga(a,b,e,f){a=a|0;b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;g=i;h=d[8+b>>0]|0;j=d[64+b>>0]|0;b=c[120+(j*12|0)>>2]<<h;k=c[124+(j*12|0)>>2]<<h;l=c[128+(j*12|0)>>2]<<h;if(!e)c[a>>2]=Z(c[a>>2]|0,b)|0;a:do if(!(f&65436)){if(f&98){e=a+4|0;h=Z(c[e>>2]|0,k)|0;j=a+20|0;m=Z(c[j>>2]|0,b)|0;n=a+24|0;o=Z(c[n>>2]|0,k)|0;p=c[a>>2]|0;q=(h>>1)-o|0;r=h+(o>>1)|0;o=m+p+32|0;h=o+r>>6;c[a>>2]=h;s=p-m+32|0;m=s+q>>6;c[e>>2]=m;e=s-q>>6;c[a+8>>2]=e;q=o-r>>6;c[a+12>>2]=q;c[a+48>>2]=h;c[a+32>>2]=h;c[a+16>>2]=h;c[a+52>>2]=m;c[a+36>>2]=m;c[j>>2]=m;c[a+56>>2]=e;c[a+40>>2]=e;c[n>>2]=e;c[a+60>>2]=q;c[a+44>>2]=q;c[a+28>>2]=q;if((h+512|0)>>>0>1023|(m+512|0)>>>0>1023|(e+512|0)>>>0>1023|(q+512|0)>>>0>1023)t=1;else break;i=g;return t|0}q=(c[a>>2]|0)+32>>6;if((q+512|0)>>>0>1023){t=1;i=g;return t|0}else{c[a+60>>2]=q;c[a+56>>2]=q;c[a+52>>2]=q;c[a+48>>2]=q;c[a+44>>2]=q;c[a+40>>2]=q;c[a+36>>2]=q;c[a+32>>2]=q;c[a+28>>2]=q;c[a+24>>2]=q;c[a+20>>2]=q;c[a+16>>2]=q;c[a+12>>2]=q;c[a+8>>2]=q;c[a+4>>2]=q;c[a>>2]=q;break}}else{q=a+4|0;e=a+56|0;m=a+60|0;h=c[m>>2]|0;n=Z(c[q>>2]|0,k)|0;c[e>>2]=Z(c[e>>2]|0,k)|0;c[m>>2]=Z(h,l)|0;h=a+8|0;m=c[h>>2]|0;e=a+16|0;j=Z(c[a+20>>2]|0,b)|0;r=Z(c[e>>2]|0,l)|0;o=a+12|0;s=c[o>>2]|0;p=Z(c[a+32>>2]|0,k)|0;u=Z(c[a+24>>2]|0,k)|0;v=c[a+28>>2]|0;w=Z(c[a+48>>2]|0,l)|0;x=Z(c[a+36>>2]|0,k)|0;y=c[a+44>>2]|0;z=Z(c[a+40>>2]|0,l)|0;A=Z(c[a+52>>2]|0,k)|0;B=c[a>>2]|0;C=j+B|0;D=B-j|0;j=(n>>1)-u|0;B=(u>>1)+n|0;n=B+C|0;c[a>>2]=n;c[q>>2]=j+D;c[h>>2]=D-j;c[o>>2]=C-B;B=Z(k,v+m|0)|0;C=Z(m-v|0,k)|0;v=(r>>1)-w|0;m=(w>>1)+r|0;r=m+B|0;c[e>>2]=r;c[a+20>>2]=v+C;c[a+24>>2]=C-v;c[a+28>>2]=B-m;m=Z(b,y+s|0)|0;B=Z(s-y|0,b)|0;y=(p>>1)-A|0;s=(A>>1)+p|0;p=s+m|0;c[a+32>>2]=p;c[a+36>>2]=y+B;c[a+40>>2]=B-y;c[a+44>>2]=m-s;s=a+56|0;m=c[s>>2]|0;y=m+x|0;B=x-m|0;m=a+60|0;x=c[m>>2]|0;A=(z>>1)-x|0;v=(x>>1)+z|0;z=v+y|0;c[a+48>>2]=z;c[a+52>>2]=A+B;c[s>>2]=B-A;c[m>>2]=y-v;v=n;n=p;p=r;r=z;z=a;y=3;while(1){m=(p>>1)-r|0;A=(r>>1)+p|0;B=n+v+32|0;s=B+A>>6;c[z>>2]=s;x=v-n+32|0;C=x+m>>6;c[z+16>>2]=C;e=x-m>>6;c[z+32>>2]=e;m=B-A>>6;c[z+48>>2]=m;if((s+512|0)>>>0>1023|(C+512|0)>>>0>1023){t=1;E=14;break}if((e+512|0)>>>0>1023|(m+512|0)>>>0>1023){t=1;E=14;break}m=z+4|0;if(!y)break a;v=c[m>>2]|0;n=c[z+36>>2]|0;p=c[z+20>>2]|0;r=c[z+52>>2]|0;z=m;y=y+-1|0}if((E|0)==14){i=g;return t|0}}while(0);t=0;i=g;return t|0}function Ha(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;e=i;f=a[64+d>>0]|0;g=a[8+d>>0]|0;h=b+8|0;j=c[h>>2]|0;k=c[b+20>>2]|0;l=b+16|0;m=c[l>>2]|0;n=b+32|0;o=c[n>>2]|0;p=b+12|0;q=c[p>>2]|0;r=c[b+24>>2]|0;s=c[b+28>>2]|0;t=b+48|0;u=c[t>>2]|0;v=c[b+36>>2]|0;w=c[b+40>>2]|0;x=c[b+44>>2]|0;y=c[b+52>>2]|0;z=c[b>>2]|0;A=k+z|0;B=z-k|0;k=b+4|0;z=c[k>>2]|0;C=z-r|0;D=r+z|0;z=D+A|0;c[b>>2]=z;r=C+B|0;c[k>>2]=r;E=B-C|0;c[h>>2]=E;h=A-D|0;c[p>>2]=h;p=s+j|0;D=j-s|0;s=m-u|0;j=u+m|0;m=j+p|0;c[l>>2]=m;u=s+D|0;c[b+20>>2]=u;A=D-s|0;c[b+24>>2]=A;s=p-j|0;c[b+28>>2]=s;j=x+q|0;p=q-x|0;x=o-y|0;q=y+o|0;o=q+j|0;c[b+32>>2]=o;y=x+p|0;c[b+36>>2]=y;D=p-x|0;c[b+40>>2]=D;x=j-q|0;c[b+44>>2]=x;q=b+56|0;j=c[q>>2]|0;p=j+v|0;C=v-j|0;j=b+60|0;v=c[j>>2]|0;B=w-v|0;F=v+w|0;w=F+p|0;c[b+48>>2]=w;v=B+C|0;c[b+52>>2]=v;G=C-B|0;c[q>>2]=G;q=p-F|0;c[j>>2]=q;j=g&255;g=c[120+((f&255)*12|0)>>2]|0;if(d>>>0>11){f=g<<j+-2;F=o+z|0;p=z-o|0;B=m-w|0;C=w+m|0;c[b>>2]=Z(C+F|0,f)|0;c[l>>2]=Z(B+p|0,f)|0;c[n>>2]=Z(p-B|0,f)|0;c[t>>2]=Z(F-C|0,f)|0;C=y+r|0;F=r-y|0;B=u-v|0;p=v+u|0;c[k>>2]=Z(p+C|0,f)|0;c[b+20>>2]=Z(B+F|0,f)|0;c[b+36>>2]=Z(F-B|0,f)|0;c[b+52>>2]=Z(C-p|0,f)|0;p=D+E|0;C=E-D|0;B=A-G|0;F=G+A|0;c[b+8>>2]=Z(F+p|0,f)|0;c[b+24>>2]=Z(B+C|0,f)|0;c[b+40>>2]=Z(C-B|0,f)|0;c[b+56>>2]=Z(p-F|0,f)|0;F=x+h|0;p=h-x|0;B=s-q|0;C=q+s|0;c[b+12>>2]=Z(C+F|0,f)|0;c[b+28>>2]=Z(B+p|0,f)|0;c[b+44>>2]=Z(p-B|0,f)|0;c[b+60>>2]=Z(F-C|0,f)|0;i=e;return}else{f=(d+-6|0)>>>0<6?1:2;d=2-j|0;j=o+z|0;C=z-o|0;o=m-w|0;z=w+m|0;c[b>>2]=(Z(z+j|0,g)|0)+f>>d;c[l>>2]=(Z(o+C|0,g)|0)+f>>d;c[n>>2]=(Z(C-o|0,g)|0)+f>>d;c[t>>2]=(Z(j-z|0,g)|0)+f>>d;z=y+r|0;j=r-y|0;y=u-v|0;r=v+u|0;c[k>>2]=(Z(r+z|0,g)|0)+f>>d;c[b+20>>2]=(Z(y+j|0,g)|0)+f>>d;c[b+36>>2]=(Z(j-y|0,g)|0)+f>>d;c[b+52>>2]=(Z(z-r|0,g)|0)+f>>d;r=D+E|0;z=E-D|0;D=A-G|0;E=G+A|0;c[b+8>>2]=(Z(E+r|0,g)|0)+f>>d;c[b+24>>2]=(Z(D+z|0,g)|0)+f>>d;c[b+40>>2]=(Z(z-D|0,g)|0)+f>>d;c[b+56>>2]=(Z(r-E|0,g)|0)+f>>d;E=x+h|0;r=h-x|0;x=s-q|0;h=q+s|0;c[b+12>>2]=(Z(h+E|0,g)|0)+f>>d;c[b+28>>2]=(Z(x+r|0,g)|0)+f>>d;c[b+44>>2]=(Z(r-x|0,g)|0)+f>>d;c[b+60>>2]=(Z(E-h|0,g)|0)+f>>d;i=e;return}}function Ia(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;e=c[120+((d[64+b>>0]|0)*12|0)>>2]|0;if(b>>>0>5){f=e<<(d[8+b>>0]|0)+-1;g=0}else{f=e;g=1}e=c[a>>2]|0;b=a+8|0;h=c[b>>2]|0;i=h+e|0;j=e-h|0;h=a+4|0;e=c[h>>2]|0;k=a+12|0;l=c[k>>2]|0;m=e-l|0;n=l+e|0;c[a>>2]=(Z(n+i|0,f)|0)>>g;c[h>>2]=(Z(i-n|0,f)|0)>>g;c[b>>2]=(Z(m+j|0,f)|0)>>g;c[k>>2]=(Z(j-m|0,f)|0)>>g;m=a+16|0;j=c[m>>2]|0;k=a+24|0;b=c[k>>2]|0;n=b+j|0;i=j-b|0;b=a+20|0;j=c[b>>2]|0;h=a+28|0;a=c[h>>2]|0;e=j-a|0;l=a+j|0;c[m>>2]=(Z(l+n|0,f)|0)>>g;c[b>>2]=(Z(n-l|0,f)|0)>>g;c[k>>2]=(Z(e+i|0,f)|0)>>g;c[h>>2]=(Z(i-e|0,f)|0)>>g;return}function Ja(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;c=i;d=1<<b+-1;if(!(d&a)){e=d;f=0}else{g=0;i=c;return g|0}while(1){d=f+1|0;e=e>>>1;if(!((e|0)!=0&(e&a|0)==0)){g=d;break}else f=d}i=c;return g|0}function Ka(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=8-(c[a+8>>2]|0)|0;e=jb(a,d)|0;if((e|0)==-1){f=1;i=b;return f|0}f=(e|0)!=(c[400+(d+-1<<2)>>2]|0)&1;i=b;return f|0}function La(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;d=c[a+12>>2]<<3;e=c[a+16>>2]|0;f=d-e|0;if((d|0)==(e|0)){g=0;i=b;return g|0}if(f>>>0>8){g=1;i=b;return g|0}else{g=((kb(a)|0)>>>(32-f|0)|0)!=(1<<f+-1|0)&1;i=b;return g|0}return 0}function Ma(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;f=c[a+(d<<2)>>2]|0;g=d;do{g=g+1|0;if(g>>>0>=b>>>0)break}while((c[a+(g<<2)>>2]|0)!=(f|0));i=e;return ((g|0)==(b|0)?0:g)|0}function Na(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=c[a+4>>2]|0;e=(b>>>0)%(d>>>0)|0;f=b-e|0;b=Z(c[a+8>>2]|0,d)|0;d=c[a>>2]|0;c[a+12>>2]=d+((f<<8)+(e<<4));g=(e<<3)+(b<<8)+(f<<6)|0;c[a+16>>2]=d+g;c[a+20>>2]=d+(g+(b<<6));return}function Oa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if((c|0)<(a|0))d=a;else d=(c|0)>(b|0)?b:c;return d|0}function Pa(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;h=i;a:do if(((e>>>0>3?(a[b>>0]|0)==0:0)?(a[b+1>>0]|0)==0:0)?(j=a[b+2>>0]|0,(j&255)<2):0){b:do if((e|0)!=3){k=j;l=-3;m=3;n=b+3|0;o=2;while(1){if(k<<24>>24)if(k<<24>>24==1&o>>>0>1){p=m;q=0;r=0;s=n;t=0;break}else u=0;else u=o+1|0;v=m+1|0;if((v|0)==(e|0))break b;k=a[n>>0]|0;l=~m;m=v;n=n+1|0;o=u}while(1){o=a[s>>0]|0;n=p+1|0;k=o<<24>>24!=0;w=(k&1^1)+t|0;q=o<<24>>24==3&(w|0)==2?1:q;if(o<<24>>24==1&w>>>0>1){x=14;break}if(k){y=w>>>0>2?1:r;z=0}else{y=r;z=w}if((n|0)==(e|0)){x=18;break}else{p=n;r=y;s=s+1|0;t=z}}if((x|0)==14){n=l+p-w|0;c[f+12>>2]=n;A=n;B=q;C=m;D=r;E=w-(w>>>0<3?w:3)|0;break a}else if((x|0)==18){n=l+e-z|0;c[f+12>>2]=n;A=n;B=q;C=m;D=y;E=z;break a}}while(0);c[g>>2]=e;F=1;i=h;return F|0}else x=19;while(0);if((x|0)==19){c[f+12>>2]=e;A=e;B=1;C=0;D=0;E=0}e=b+C|0;c[f>>2]=e;c[f+4>>2]=e;c[f+8>>2]=0;c[f+16>>2]=0;b=f+12|0;c[g>>2]=E+C+A;if(D){F=1;i=h;return F|0}if(!B){F=0;i=h;return F|0}B=c[b>>2]|0;D=e;A=e;e=0;c:while(1){C=B;G=D;E=e;while(1){g=C;C=C+-1|0;if(!g){x=31;break c}H=a[G>>0]|0;if((E|0)!=2){I=E;break}if(H<<24>>24!=3){x=29;break}if(!C){F=1;x=32;break c}g=G+1|0;if((d[g>>0]|0)>3){F=1;x=32;break c}else{G=g;E=0}}if((x|0)==29){x=0;if((H&255)<3){F=1;x=32;break}else I=2}a[A>>0]=H;B=C;D=G+1|0;A=A+1|0;e=H<<24>>24==0?I+1|0:0}if((x|0)==31){c[b>>2]=A-G+(c[b>>2]|0);F=0;i=h;return F|0}else if((x|0)==32){i=h;return F|0}return 0}function Qa(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;d=i;i=i+16|0;e=d;ld(b,0,92);f=jb(a,8)|0;a:do if((((f|0)!=-1?(c[b>>2]=f,jb(a,1)|0,jb(a,1)|0,(jb(a,1)|0)!=-1):0)?(jb(a,5)|0)!=-1:0)?(g=jb(a,8)|0,(g|0)!=-1):0){h=b+4|0;c[h>>2]=g;g=b+8|0;j=nb(a,g)|0;if(!j)if((c[g>>2]|0)>>>0<=31){g=nb(a,e)|0;if(!g){k=c[e>>2]|0;if(k>>>0<=12){c[b+12>>2]=1<<k+4;k=nb(a,e)|0;if(!k){l=c[e>>2]|0;if(l>>>0<=2){c[b+16>>2]=l;b:do if((l|0)==1){m=jb(a,1)|0;if((m|0)==-1){n=1;break a}c[b+24>>2]=(m|0)==1&1;m=ob(a,b+28|0)|0;if(m){n=m;break a}m=ob(a,b+32|0)|0;if(m){n=m;break a}m=b+36|0;o=nb(a,m)|0;if(o){n=o;break a}o=c[m>>2]|0;if(o>>>0>255){n=1;break a}if(!o){c[b+40>>2]=0;break}p=id(o<<2)|0;o=b+40|0;c[o>>2]=p;if(!p){n=65535;break a}if(c[m>>2]|0){q=p;p=0;while(1){r=ob(a,q+(p<<2)|0)|0;s=p+1|0;if(r){n=r;break a}if(s>>>0>=(c[m>>2]|0)>>>0)break b;q=c[o>>2]|0;p=s}}}else if(!l){p=nb(a,e)|0;if(p){n=p;break a}p=c[e>>2]|0;if(p>>>0>12){n=1;break a}c[b+20>>2]=1<<p+4}while(0);l=b+44|0;p=nb(a,l)|0;if(!p)if((c[l>>2]|0)>>>0<=16?(o=jb(a,1)|0,(o|0)!=-1):0){c[b+48>>2]=(o|0)==1&1;o=nb(a,e)|0;if(!o){q=b+52|0;c[q>>2]=(c[e>>2]|0)+1;m=nb(a,e)|0;if(!m){s=b+56|0;c[s>>2]=(c[e>>2]|0)+1;r=jb(a,1)|0;if((!((r|0)==0|(r|0)==-1)?(jb(a,1)|0)!=-1:0)?(r=jb(a,1)|0,(r|0)!=-1):0){t=(r|0)==1;c[b+60>>2]=t&1;if(t){t=b+64|0;r=nb(a,t)|0;if(r){n=r;break}r=b+68|0;u=nb(a,r)|0;if(u){n=u;break}u=b+72|0;v=nb(a,u)|0;if(v){n=v;break}v=b+76|0;w=nb(a,v)|0;if(w){n=w;break}w=c[q>>2]|0;if((c[t>>2]|0)>((w<<3)+~c[r>>2]|0)){n=1;break}r=c[s>>2]|0;if((c[u>>2]|0)>((r<<3)+~c[v>>2]|0)){n=1;break}else{x=w;y=r}}else{x=c[q>>2]|0;y=c[s>>2]|0}s=Z(y,x)|0;do switch(c[h>>2]|0){case 11:{z=396;A=345600;B=58;break}case 12:{z=396;A=912384;B=58;break}case 13:{z=396;A=912384;B=58;break}case 20:{z=396;A=912384;B=58;break}case 21:{z=792;A=1824768;B=58;break}case 22:{z=1620;A=3110400;B=58;break}case 30:{z=1620;A=3110400;B=58;break}case 31:{z=3600;A=6912e3;B=58;break}case 32:{z=5120;A=7864320;B=58;break}case 40:{z=8192;A=12582912;B=58;break}case 41:{z=8192;A=12582912;B=58;break}case 42:{z=8704;A=13369344;B=58;break}case 50:{z=22080;A=42393600;B=58;break}case 51:{z=36864;A=70778880;B=58;break}case 10:{z=99;A=152064;B=58;break}default:B=60}while(0);do if((B|0)==58){if(z>>>0<s>>>0){B=60;break}h=(A>>>0)/((s*384|0)>>>0)|0;q=h>>>0<16?h:16;c[e>>2]=q;h=c[l>>2]|0;if(h>>>0>q>>>0){C=h;B=61}else D=q}while(0);if((B|0)==60){c[e>>2]=2147483647;C=c[l>>2]|0;B=61}if((B|0)==61){c[e>>2]=C;D=C}s=b+88|0;c[s>>2]=D;q=jb(a,1)|0;if((q|0)==-1){n=1;break}h=(q|0)==1;c[b+80>>2]=h&1;do if(h){q=id(952)|0;r=b+84|0;c[r>>2]=q;if(!q){n=65535;break a}w=Hc(a,q)|0;if(w){n=w;break a}w=c[r>>2]|0;if(!(c[w+920>>2]|0))break;r=c[w+948>>2]|0;if((c[w+944>>2]|0)>>>0>r>>>0){n=1;break a}if(r>>>0<(c[l>>2]|0)>>>0){n=1;break a}if(r>>>0>(c[s>>2]|0)>>>0){n=1;break a}c[s>>2]=(r|0)==0?1:r}while(0);Ka(a)|0;n=0}else n=1}else n=m}else n=o}else n=1;else n=p}else n=1}else n=k}else n=1}else n=g}else n=1;else n=j}else n=1;while(0);i=d;return n|0}function Ra(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;d=i;if((c[a>>2]|0)!=(c[b>>2]|0)){e=1;i=d;return e|0}if((c[a+4>>2]|0)!=(c[b+4>>2]|0)){e=1;i=d;return e|0}if((c[a+12>>2]|0)!=(c[b+12>>2]|0)){e=1;i=d;return e|0}f=c[a+16>>2]|0;if((f|0)!=(c[b+16>>2]|0)){e=1;i=d;return e|0}if((c[a+44>>2]|0)!=(c[b+44>>2]|0)){e=1;i=d;return e|0}if((c[a+48>>2]|0)!=(c[b+48>>2]|0)){e=1;i=d;return e|0}if((c[a+52>>2]|0)!=(c[b+52>>2]|0)){e=1;i=d;return e|0}if((c[a+56>>2]|0)!=(c[b+56>>2]|0)){e=1;i=d;return e|0}g=c[a+60>>2]|0;if((g|0)!=(c[b+60>>2]|0)){e=1;i=d;return e|0}if((c[a+80>>2]|0)!=(c[b+80>>2]|0)){e=1;i=d;return e|0}a:do if(!f){if((c[a+20>>2]|0)!=(c[b+20>>2]|0)){e=1;i=d;return e|0}}else if((f|0)==1){if((c[a+24>>2]|0)!=(c[b+24>>2]|0)){e=1;i=d;return e|0}if((c[a+28>>2]|0)!=(c[b+28>>2]|0)){e=1;i=d;return e|0}if((c[a+32>>2]|0)!=(c[b+32>>2]|0)){e=1;i=d;return e|0}h=c[a+36>>2]|0;if((h|0)!=(c[b+36>>2]|0)){e=1;i=d;return e|0}if(h){j=c[a+40>>2]|0;k=c[b+40>>2]|0;l=0;while(1){if((c[j+(l<<2)>>2]|0)!=(c[k+(l<<2)>>2]|0)){e=1;break}l=l+1|0;if(l>>>0>=h>>>0)break a}i=d;return e|0}}while(0);if(g){if((c[a+64>>2]|0)!=(c[b+64>>2]|0)){e=1;i=d;return e|0}if((c[a+68>>2]|0)!=(c[b+68>>2]|0)){e=1;i=d;return e|0}if((c[a+72>>2]|0)!=(c[b+72>>2]|0)){e=1;i=d;return e|0}if((c[a+76>>2]|0)!=(c[b+76>>2]|0)){e=1;i=d;return e|0}}e=0;i=d;return e|0}function Sa(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;i=i+16|0;e=d+4|0;f=d;ld(b,0,72);g=nb(a,b)|0;if(g){h=g;i=d;return h|0}if((c[b>>2]|0)>>>0>255){h=1;i=d;return h|0}g=b+4|0;j=nb(a,g)|0;if(j){h=j;i=d;return h|0}if((c[g>>2]|0)>>>0>31){h=1;i=d;return h|0}if(jb(a,1)|0){h=1;i=d;return h|0}g=jb(a,1)|0;if((g|0)==-1){h=1;i=d;return h|0}c[b+8>>2]=(g|0)==1&1;g=nb(a,e)|0;if(g){h=g;i=d;return h|0}g=(c[e>>2]|0)+1|0;j=b+12|0;c[j>>2]=g;if(g>>>0>8){h=1;i=d;return h|0}a:do if(g>>>0>1){k=b+16|0;l=nb(a,k)|0;if(l){h=l;i=d;return h|0}l=c[k>>2]|0;if(l>>>0>6){h=1;i=d;return h|0}switch(l|0){case 6:{l=nb(a,e)|0;if(l){h=l;i=d;return h|0}l=(c[e>>2]|0)+1|0;k=b+40|0;c[k>>2]=l;m=id(l<<2)|0;l=b+44|0;c[l>>2]=m;if(!m){h=65535;i=d;return h|0}m=c[432+((c[j>>2]|0)+-1<<2)>>2]|0;if(!(c[k>>2]|0))break a;else n=0;while(1){o=jb(a,m)|0;c[(c[l>>2]|0)+(n<<2)>>2]=o;n=n+1|0;if(o>>>0>=(c[j>>2]|0)>>>0){h=1;break}if(n>>>0>=(c[k>>2]|0)>>>0)break a}i=d;return h|0}case 5:case 4:case 3:{k=jb(a,1)|0;if((k|0)==-1){h=1;i=d;return h|0}c[b+32>>2]=(k|0)==1&1;k=nb(a,e)|0;if(!k){c[b+36>>2]=(c[e>>2]|0)+1;break a}else{h=k;i=d;return h|0}break}case 0:{k=id(c[j>>2]<<2)|0;l=b+20|0;c[l>>2]=k;if(!k){h=65535;i=d;return h|0}if(!(c[j>>2]|0))break a;else p=0;while(1){k=nb(a,e)|0;if(k){h=k;break}c[(c[l>>2]|0)+(p<<2)>>2]=(c[e>>2]|0)+1;p=p+1|0;if(p>>>0>=(c[j>>2]|0)>>>0)break a}i=d;return h|0}case 2:{l=b+24|0;c[l>>2]=id((c[j>>2]<<2)+-4|0)|0;k=id((c[j>>2]<<2)+-4|0)|0;m=b+28|0;c[m>>2]=k;if((c[l>>2]|0)==0|(k|0)==0){h=65535;i=d;return h|0}if((c[j>>2]|0)==1)break a;else q=0;while(1){k=nb(a,e)|0;if(k){h=k;r=46;break}c[(c[l>>2]|0)+(q<<2)>>2]=c[e>>2];k=nb(a,e)|0;if(k){h=k;r=46;break}c[(c[m>>2]|0)+(q<<2)>>2]=c[e>>2];q=q+1|0;if(q>>>0>=((c[j>>2]|0)+-1|0)>>>0)break a}if((r|0)==46){i=d;return h|0}break}default:break a}}while(0);r=nb(a,e)|0;if(r){h=r;i=d;return h|0}r=c[e>>2]|0;if(r>>>0>31){h=1;i=d;return h|0}c[b+48>>2]=r+1;r=nb(a,e)|0;if(r){h=r;i=d;return h|0}if((c[e>>2]|0)>>>0>31){h=1;i=d;return h|0}if(jb(a,1)|0){h=1;i=d;return h|0}if((jb(a,2)|0)>>>0>2){h=1;i=d;return h|0}e=ob(a,f)|0;if(e){h=e;i=d;return h|0}e=(c[f>>2]|0)+26|0;if(e>>>0>51){h=1;i=d;return h|0}c[b+52>>2]=e;e=ob(a,f)|0;if(e){h=e;i=d;return h|0}if(((c[f>>2]|0)+26|0)>>>0>51){h=1;i=d;return h|0}e=ob(a,f)|0;if(e){h=e;i=d;return h|0}e=c[f>>2]|0;if((e+12|0)>>>0>24){h=1;i=d;return h|0}c[b+56>>2]=e;e=jb(a,1)|0;if((e|0)==-1){h=1;i=d;return h|0}c[b+60>>2]=(e|0)==1&1;e=jb(a,1)|0;if((e|0)==-1){h=1;i=d;return h|0}c[b+64>>2]=(e|0)==1&1;e=jb(a,1)|0;if((e|0)==-1){h=1;i=d;return h|0}c[b+68>>2]=(e|0)==1&1;Ka(a)|0;h=0;i=d;return h|0}function Ta(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;g=i;i=i+32|0;h=g+20|0;j=g+16|0;k=g+12|0;l=g+8|0;m=g+4|0;n=g;ld(b,0,988);o=Z(c[d+56>>2]|0,c[d+52>>2]|0)|0;p=nb(a,m)|0;if(p){q=p;i=g;return q|0}p=c[m>>2]|0;c[b>>2]=p;if(p>>>0>=o>>>0){q=1;i=g;return q|0}p=nb(a,m)|0;if(p){q=p;i=g;return q|0}p=c[m>>2]|0;r=b+4|0;c[r>>2]=p;if((p|0)==5|(p|0)==0)s=5;else if(!((p|0)==7|(p|0)==2)){q=1;i=g;return q|0}if((s|0)==5){if((c[f>>2]|0)==5){q=1;i=g;return q|0}if(!(c[d+44>>2]|0)){q=1;i=g;return q|0}}p=nb(a,m)|0;if(p){q=p;i=g;return q|0}p=c[m>>2]|0;c[b+8>>2]=p;if((p|0)!=(c[e>>2]|0)){q=1;i=g;return q|0}p=d+12|0;t=c[p>>2]|0;u=0;while(1)if(!(t>>>u))break;else u=u+1|0;t=jb(a,u+-1|0)|0;if((t|0)==-1){q=1;i=g;return q|0}u=(c[f>>2]|0)==5;if(u&(t|0)!=0){q=1;i=g;return q|0}c[b+12>>2]=t;if(u){u=nb(a,m)|0;if(u){q=u;i=g;return q|0}u=c[m>>2]|0;c[b+16>>2]=u;if(u>>>0>65535){q=1;i=g;return q|0}}u=d+16|0;t=c[u>>2]|0;if(!t){v=d+20|0;w=c[v>>2]|0;x=0;while(1)if(!(w>>>x))break;else x=x+1|0;w=jb(a,x+-1|0)|0;if((w|0)==-1){q=1;i=g;return q|0}x=b+20|0;c[x>>2]=w;do if(c[e+8>>2]|0){w=ob(a,n)|0;if(!w){c[b+24>>2]=c[n>>2];break}else{q=w;i=g;return q|0}}while(0);if((c[f>>2]|0)==5){w=c[x>>2]|0;if(w>>>0>(c[v>>2]|0)>>>1>>>0){q=1;i=g;return q|0}v=c[b+24>>2]|0;if((w|0)!=(((v|0)>0?0:0-v|0)|0)){q=1;i=g;return q|0}}y=c[u>>2]|0}else y=t;if((y|0)==1?(c[d+24>>2]|0)==0:0){y=ob(a,n)|0;if(y){q=y;i=g;return q|0}y=b+28|0;c[y>>2]=c[n>>2];do if(c[e+8>>2]|0){t=ob(a,n)|0;if(!t){c[b+32>>2]=c[n>>2];break}else{q=t;i=g;return q|0}}while(0);if((c[f>>2]|0)==5?(t=c[y>>2]|0,y=(c[d+32>>2]|0)+t+(c[b+32>>2]|0)|0,(((t|0)<(y|0)?t:y)|0)!=0):0){q=1;i=g;return q|0}}if(c[e+68>>2]|0){y=nb(a,m)|0;if(y){q=y;i=g;return q|0}y=c[m>>2]|0;c[b+36>>2]=y;if(y>>>0>127){q=1;i=g;return q|0}}y=c[r>>2]|0;if((y|0)==5|(y|0)==0){t=jb(a,1)|0;if((t|0)==-1){q=1;i=g;return q|0}c[b+40>>2]=t;do if(!t){u=c[e+48>>2]|0;if(u>>>0>16){q=1;i=g;return q|0}else{c[b+44>>2]=u;break}}else{u=nb(a,m)|0;if(u){q=u;i=g;return q|0}u=c[m>>2]|0;if(u>>>0>15){q=1;i=g;return q|0}else{c[b+44>>2]=u+1;break}}while(0);z=c[r>>2]|0}else z=y;do if((z|0)==5|(z|0)==0){y=c[b+44>>2]|0;r=c[p>>2]|0;t=jb(a,1)|0;if((t|0)==-1){q=1;i=g;return q|0}c[b+68>>2]=t;if(t){t=0;a:while(1){if(t>>>0>y>>>0){q=1;s=110;break}u=nb(a,l)|0;if(u){q=u;s=110;break}u=c[l>>2]|0;if(u>>>0>3){q=1;s=110;break}c[b+(t*12|0)+72>>2]=u;do if(u>>>0<2){v=nb(a,k)|0;if(v){q=v;s=110;break a}v=c[k>>2]|0;if(v>>>0>=r>>>0){q=1;s=110;break a}c[b+(t*12|0)+76>>2]=v+1}else{if((u|0)!=2)break;v=nb(a,k)|0;if(v){q=v;s=110;break a}c[b+(t*12|0)+80>>2]=c[k>>2]}while(0);if((c[l>>2]|0)==3){s=61;break}else t=t+1|0}if((s|0)==61){if(!t)q=1;else break;i=g;return q|0}else if((s|0)==110){i=g;return q|0}}}while(0);do if(c[f+4>>2]|0){l=c[d+44>>2]|0;k=(c[f>>2]|0)==5;p=jb(a,1)|0;z=(p|0)==-1;if(k){if(z){q=1;i=g;return q|0}c[b+276>>2]=p;k=jb(a,1)|0;if((k|0)==-1){q=1;i=g;return q|0}c[b+280>>2]=k;if((l|0)!=0|(k|0)==0)break;else q=1;i=g;return q|0}if(z){q=1;i=g;return q|0}c[b+284>>2]=p;if(p){p=(l<<1)+2|0;z=0;k=0;r=0;y=0;u=0;while(1){if(z>>>0>p>>>0){q=1;s=110;break}v=nb(a,j)|0;if(v){q=v;s=110;break}v=c[j>>2]|0;if(v>>>0>6){q=1;s=110;break}c[b+(z*20|0)+288>>2]=v;if((v&-3|0)==1){w=nb(a,h)|0;if(w){q=w;s=110;break}c[b+(z*20|0)+292>>2]=(c[h>>2]|0)+1;A=c[j>>2]|0}else A=v;if((A|0)==2){v=nb(a,h)|0;if(v){q=v;s=110;break}c[b+(z*20|0)+296>>2]=c[h>>2];B=c[j>>2]|0}else B=A;if((B|0)==3|(B|0)==6){v=nb(a,h)|0;if(v){q=v;s=110;break}c[b+(z*20|0)+300>>2]=c[h>>2];C=c[j>>2]|0}else C=B;if((C|0)==4){v=nb(a,h)|0;if(v){q=v;s=110;break}v=c[h>>2]|0;if(v>>>0>l>>>0){q=1;s=110;break}if(!v)c[b+(z*20|0)+304>>2]=65535;else c[b+(z*20|0)+304>>2]=v+-1;D=c[j>>2]|0;E=r+1|0}else{D=C;E=r}y=((D|0)==5&1)+y|0;k=((D|0)!=0&D>>>0<4&1)+k|0;u=((D|0)==6&1)+u|0;if(!D){s=90;break}else{z=z+1|0;r=E}}if((s|0)==90){if(E>>>0>1|y>>>0>1|u>>>0>1){q=1;i=g;return q|0}if((k|0)!=0&(y|0)!=0)q=1;else break;i=g;return q|0}else if((s|0)==110){i=g;return q|0}}}while(0);s=ob(a,n)|0;if(s){q=s;i=g;return q|0}s=c[n>>2]|0;c[b+48>>2]=s;E=s+(c[e+52>>2]|0)|0;c[n>>2]=E;if(E>>>0>51){q=1;i=g;return q|0}do if(c[e+60>>2]|0){E=nb(a,m)|0;if(E){q=E;i=g;return q|0}E=c[m>>2]|0;c[b+52>>2]=E;if(E>>>0>2){q=1;i=g;return q|0}if((E|0)==1)break;E=ob(a,n)|0;if(E){q=E;i=g;return q|0}E=c[n>>2]|0;if((E+6|0)>>>0>12){q=1;i=g;return q|0}c[b+56>>2]=E<<1;E=ob(a,n)|0;if(E){q=E;i=g;return q|0}E=c[n>>2]|0;if((E+6|0)>>>0>12){q=1;i=g;return q|0}else{c[b+60>>2]=E<<1;break}}while(0);do if((c[e+12>>2]|0)>>>0>1?((c[e+16>>2]|0)+-3|0)>>>0<3:0){n=e+36|0;E=c[n>>2]|0;s=(((o>>>0)%(E>>>0)|0|0)==0?1:2)+((o>>>0)/(E>>>0)|0)|0;E=0;while(1){F=E+1|0;if(!(-1<<F&s))break;else E=F}y=jb(a,((1<<E)+-1&s|0)==0?E:F)|0;c[m>>2]=y;if((y|0)==-1){q=1;i=g;return q|0}c[b+64>>2]=y;k=c[n>>2]|0;if(y>>>0>(((o+-1+k|0)>>>0)/(k>>>0)|0)>>>0)q=1;else break;i=g;return q|0}while(0);q=0;i=g;return q|0}function Ua(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;i=i+32|0;e=d+20|0;f=d;c[f+0>>2]=c[a+0>>2];c[f+4>>2]=c[a+4>>2];c[f+8>>2]=c[a+8>>2];c[f+12>>2]=c[a+12>>2];c[f+16>>2]=c[a+16>>2];a=nb(f,e)|0;if(!a){g=nb(f,e)|0;if(!g){h=nb(f,e)|0;if(!h){f=c[e>>2]|0;if(f>>>0>255)j=1;else{c[b>>2]=f;j=0}}else j=h}else j=g}else j=a;i=d;return j|0}function Va(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+32|0;f=e+20|0;g=e;c[g+0>>2]=c[a+0>>2];c[g+4>>2]=c[a+4>>2];c[g+8>>2]=c[a+8>>2];c[g+12>>2]=c[a+12>>2];c[g+16>>2]=c[a+16>>2];a=nb(g,f)|0;if(a){h=a;i=e;return h|0}a=nb(g,f)|0;if(a){h=a;i=e;return h|0}a=nb(g,f)|0;if(!a)j=0;else{h=a;i=e;return h|0}while(1)if(!(b>>>j))break;else j=j+1|0;b=jb(g,j+-1|0)|0;if((b|0)==-1){h=1;i=e;return h|0}c[d>>2]=b;h=0;i=e;return h|0}function Wa(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;i=i+32|0;g=f+20|0;h=f;if((d|0)!=5){j=1;i=f;return j|0};c[h+0>>2]=c[a+0>>2];c[h+4>>2]=c[a+4>>2];c[h+8>>2]=c[a+8>>2];c[h+12>>2]=c[a+12>>2];c[h+16>>2]=c[a+16>>2];a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(!a)k=0;else{j=a;i=f;return j|0}while(1)if(!(b>>>k))break;else k=k+1|0;if((jb(h,k+-1|0)|0)==-1){j=1;i=f;return j|0}j=nb(h,e)|0;i=f;return j|0}function Xa(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;i=i+32|0;g=f+20|0;h=f;c[h+0>>2]=c[a+0>>2];c[h+4>>2]=c[a+4>>2];c[h+8>>2]=c[a+8>>2];c[h+12>>2]=c[a+12>>2];c[h+16>>2]=c[a+16>>2];a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=c[b+12>>2]|0;k=0;while(1)if(!(a>>>k))break;else k=k+1|0;if((jb(h,k+-1|0)|0)==-1){j=1;i=f;return j|0}if((d|0)==5?(d=nb(h,g)|0,(d|0)!=0):0){j=d;i=f;return j|0}d=c[b+20>>2]|0;b=0;while(1)if(!(d>>>b))break;else b=b+1|0;d=jb(h,b+-1|0)|0;if((d|0)==-1){j=1;i=f;return j|0}c[e>>2]=d;j=0;i=f;return j|0}function Ya(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0;f=i;i=i+32|0;g=f+20|0;h=f;c[h+0>>2]=c[a+0>>2];c[h+4>>2]=c[a+4>>2];c[h+8>>2]=c[a+8>>2];c[h+12>>2]=c[a+12>>2];c[h+16>>2]=c[a+16>>2];a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=nb(h,g)|0;if(a){j=a;i=f;return j|0}a=c[b+12>>2]|0;k=0;while(1)if(!(a>>>k))break;else k=k+1|0;if((jb(h,k+-1|0)|0)==-1){j=1;i=f;return j|0}if((d|0)==5?(d=nb(h,g)|0,(d|0)!=0):0){j=d;i=f;return j|0}d=c[b+20>>2]|0;b=0;while(1)if(!(d>>>b))break;else b=b+1|0;if((jb(h,b+-1|0)|0)==-1){j=1;i=f;return j|0}j=ob(h,e)|0;i=f;return j|0}function Za(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0;g=i;i=i+32|0;h=g+20|0;j=g;c[j+0>>2]=c[a+0>>2];c[j+4>>2]=c[a+4>>2];c[j+8>>2]=c[a+8>>2];c[j+12>>2]=c[a+12>>2];c[j+16>>2]=c[a+16>>2];a=nb(j,h)|0;if(a){k=a;i=g;return k|0}a=nb(j,h)|0;if(a){k=a;i=g;return k|0}a=nb(j,h)|0;if(a){k=a;i=g;return k|0}a=c[b+12>>2]|0;b=0;while(1)if(!(a>>>b))break;else b=b+1|0;if((jb(j,b+-1|0)|0)==-1){k=1;i=g;return k|0}if((d|0)==5?(d=nb(j,h)|0,(d|0)!=0):0){k=d;i=g;return k|0}d=ob(j,f)|0;if(d){k=d;i=g;return k|0}if((e|0)!=0?(e=ob(j,f+4|0)|0,(e|0)!=0):0){k=e;i=g;return k|0}k=0;i=g;return k|0}function _a(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+32|0;g=f+24|0;h=f+20|0;j=f;c[j+0>>2]=c[b+0>>2];c[j+4>>2]=c[b+4>>2];c[j+8>>2]=c[b+8>>2];c[j+12>>2]=c[b+12>>2];c[j+16>>2]=c[b+16>>2];b=nb(j,g)|0;if(b){k=b;i=f;return k|0}b=nb(j,g)|0;if(b){k=b;i=f;return k|0}b=nb(j,g)|0;if(b){k=b;i=f;return k|0}b=c[d+12>>2]|0;l=0;while(1)if(!(b>>>l))break;else l=l+1|0;if((jb(j,l+-1|0)|0)==-1){k=1;i=f;return k|0}l=nb(j,g)|0;if(l){k=l;i=f;return k|0}l=d+16|0;b=c[l>>2]|0;if(!b){m=c[d+20>>2]|0;n=0;while(1)if(!(m>>>n))break;else n=n+1|0;if((jb(j,n+-1|0)|0)==-1){k=1;i=f;return k|0}if((c[e+8>>2]|0)!=0?(n=ob(j,h)|0,(n|0)!=0):0){k=n;i=f;return k|0}o=c[l>>2]|0}else o=b;if((o|0)==1?(c[d+24>>2]|0)==0:0){d=ob(j,h)|0;if(d){k=d;i=f;return k|0}if((c[e+8>>2]|0)!=0?(d=ob(j,h)|0,(d|0)!=0):0){k=d;i=f;return k|0}}if((c[e+68>>2]|0)!=0?(e=nb(j,g)|0,(e|0)!=0):0){k=e;i=f;return k|0}e=jb(j,1)|0;c[a>>2]=e;k=(e|0)==-1&1;i=f;return k|0}function $a(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;f=i;i=i+448|0;g=f+8|0;h=f+4|0;j=f;k=g+(0-g&15)|0;g=c[b+3376>>2]|0;l=c[e>>2]|0;c[h>>2]=0;m=b+1192|0;c[m>>2]=(c[m>>2]|0)+1;n=b+1200|0;c[n>>2]=0;o=b+12|0;c[j>>2]=(c[e+48>>2]|0)+(c[(c[o>>2]|0)+52>>2]|0);p=e+36|0;q=b+1212|0;r=e+52|0;s=e+56|0;t=e+60|0;u=e+4|0;v=e+44|0;e=b+1220|0;w=b+1172|0;x=b+1176|0;y=g+12|0;z=l;l=0;A=0;while(1){B=c[q>>2]|0;if((c[p>>2]|0)==0?(c[B+(z*216|0)+196>>2]|0)!=0:0){C=1;D=22;break}E=c[(c[o>>2]|0)+56>>2]|0;F=c[r>>2]|0;G=c[s>>2]|0;H=c[t>>2]|0;c[B+(z*216|0)+4>>2]=c[m>>2];c[B+(z*216|0)+8>>2]=F;c[B+(z*216|0)+12>>2]=G;c[B+(z*216|0)+16>>2]=H;c[B+(z*216|0)+24>>2]=E;E=c[u>>2]|0;if((E|0)!=2?!((E|0)==7|(A|0)!=0):0){E=nb(a,h)|0;if(E){C=E;D=22;break}E=c[h>>2]|0;if(E>>>0>((c[x>>2]|0)-z|0)>>>0){C=1;D=22;break}if(!E)I=0;else{ld(y,0,164);c[g>>2]=0;I=1}}else I=A;E=c[h>>2]|0;if(!E){B=bb(a,g,(c[q>>2]|0)+(z*216|0)|0,c[u>>2]|0,c[v>>2]|0)|0;if(!B)J=0;else{C=B;D=22;break}}else{c[h>>2]=E+-1;J=I}E=gb((c[q>>2]|0)+(z*216|0)|0,g,d,e,j,z,c[(c[o>>2]|0)+64>>2]|0,k)|0;if(E){C=E;D=22;break}l=((c[(c[q>>2]|0)+(z*216|0)+196>>2]|0)==1&1)+l|0;if(!(La(a)|0))K=(c[h>>2]|0)!=0;else K=1;E=c[u>>2]|0;if((E|0)==7|(E|0)==2)c[n>>2]=z;z=Ma(c[w>>2]|0,c[x>>2]|0,z)|0;if(!((z|0)!=0|K^1)){C=1;D=22;break}if(!K){D=20;break}else A=J}if((D|0)==20){J=b+1196|0;b=(c[J>>2]|0)+l|0;if(b>>>0>(c[x>>2]|0)>>>0){C=1;i=f;return C|0}c[J>>2]=b;C=0;i=f;return C|0}else if((D|0)==22){i=f;return C|0}return 0}function ab(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;d=i;e=c[a+1192>>2]|0;f=c[a+1200>>2]|0;g=a+1212|0;a:do if(!f)h=b;else{j=a+16|0;k=f;l=0;while(1){m=k;do{m=m+-1|0;if(m>>>0<=b>>>0){h=m;break a}}while((c[(c[g>>2]|0)+(m*216|0)+4>>2]|0)!=(e|0));l=l+1|0;n=c[(c[j>>2]|0)+52>>2]|0;if(l>>>0>=(n>>>0>10?n:10)>>>0){h=m;break}else k=m}}while(0);b=a+1172|0;f=a+1176|0;a=h;while(1){h=c[g>>2]|0;if((c[h+(a*216|0)+4>>2]|0)!=(e|0)){o=11;break}k=h+(a*216|0)+196|0;h=c[k>>2]|0;if(!h){o=11;break}c[k>>2]=h+-1;a=Ma(c[b>>2]|0,c[f>>2]|0,a)|0;if(!a){o=11;break}}if((o|0)==11){i=d;return}}function bb(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0;h=i;i=i+32|0;j=h+20|0;k=h+16|0;l=h+12|0;m=h+8|0;n=h+4|0;o=h;ld(d,0,2088);p=nb(a,n)|0;q=c[n>>2]|0;do if((f|0)==2|(f|0)==7){r=q+6|0;if(r>>>0>31|(p|0)!=0){s=1;i=h;return s|0}else{c[d>>2]=r;t=r;break}}else{r=q+1|0;if(r>>>0>31|(p|0)!=0){s=1;i=h;return s|0}else{c[d>>2]=r;t=r;break}}while(0);a:do if((t|0)!=31){b:do if(t>>>0>=6){p=(t|0)!=6;q=p&1;if(!q){c[k>>2]=0;f=0;while(1){r=kb(a)|0;c[j>>2]=r;u=r>>>31;c[d+(f<<2)+12>>2]=u;if(!u){c[d+(f<<2)+76>>2]=r>>>28&7;v=r<<4;w=1}else{v=r<<1;w=0}r=f|1;u=v>>>31;c[d+(r<<2)+12>>2]=u;if(!u){c[d+(r<<2)+76>>2]=v>>>28&7;x=v<<4;y=w+1|0}else{x=v<<1;y=w}u=r+1|0;r=x>>>31;c[d+(u<<2)+12>>2]=r;if(!r){c[d+(u<<2)+76>>2]=x>>>28&7;z=x<<4;A=y+1|0}else{z=x<<1;A=y}u=f|3;r=z>>>31;c[d+(u<<2)+12>>2]=r;if(!r){c[d+(u<<2)+76>>2]=z>>>28&7;B=z<<4;C=A+1|0}else{B=z<<1;C=A}r=u+1|0;D=B>>>31;c[d+(r<<2)+12>>2]=D;if(!D){c[d+(r<<2)+76>>2]=B>>>28&7;E=B<<4;F=C+1|0}else{E=B<<1;F=C}r=u+2|0;D=E>>>31;c[d+(r<<2)+12>>2]=D;if(!D){c[d+(r<<2)+76>>2]=E>>>28&7;G=E<<4;H=F+1|0}else{G=E<<1;H=F}r=u+3|0;u=G>>>31;c[d+(r<<2)+12>>2]=u;if(!u){c[d+(r<<2)+76>>2]=G>>>28&7;I=G<<4;J=H+1|0}else{I=G<<1;J=H}r=f|7;u=I>>>31;c[d+(r<<2)+12>>2]=u;if(!u){c[d+(r<<2)+76>>2]=I>>>28&7;K=I<<4;L=J+1|0}else{K=I<<1;L=J}c[j>>2]=K;if((lb(a,(L*3|0)+8|0)|0)==-1){M=k;N=j;O=1;P=68;break b}r=(c[k>>2]|0)+1|0;c[k>>2]=r;if((r|0)<2)f=f+8|0;else{P=52;break}}}else if((q|0)==1)P=52;if((P|0)==52){f=(nb(a,j)|0)!=0;r=c[j>>2]|0;if(f|r>>>0>3){M=k;N=j;O=1;P=68;break}c[d+140>>2]=r}if(p){r=c[d>>2]|0;f=r+-7|0;u=f>>>2;c[d+4>>2]=(f>>>0>11?u+268435453|0:u)<<4|(r>>>0>18?15:0)}else{Q=q;P=70}}else{if((t|0)==0|(t|0)==1){R=k;S=j}else if(!((t|0)==3|(t|0)==2)){r=0;do{u=(nb(a,l)|0)!=0;f=c[l>>2]|0;if(u|f>>>0>3){s=1;P=95;break}c[d+(r<<2)+176>>2]=f;r=r+1|0}while(r>>>0<4);if((P|0)==95){i=h;return s|0}c:do if(g>>>0>1&(t|0)!=5){r=g>>>0>2&1;q=0;while(1){if(qb(a,l,r)|0){s=1;P=95;break}p=c[l>>2]|0;if(p>>>0>=g>>>0){s=1;P=95;break}c[d+(q<<2)+192>>2]=p;q=q+1|0;if(q>>>0>=4){T=0;break c}}if((P|0)==95){i=h;return s|0}}else T=0;while(0);d:while(1){q=c[d+(T<<2)+176>>2]|0;if(!q)U=0;else if((q|0)==2|(q|0)==1)U=1;else U=3;c[l>>2]=U;q=0;while(1){r=ob(a,m)|0;if(r){s=r;P=95;break d}b[d+(T<<4)+(q<<2)+208>>1]=c[m>>2];r=ob(a,m)|0;if(r){s=r;P=95;break d}b[d+(T<<4)+(q<<2)+210>>1]=c[m>>2];r=c[l>>2]|0;c[l>>2]=r+-1;if(!r)break;else q=q+1|0}T=T+1|0;if(T>>>0>=4){Q=2;P=70;break b}}if((P|0)==95){i=h;return s|0}}else{R=k;S=j}if(g>>>0>1){if((t|0)==3|(t|0)==2)V=1;else if((t|0)==0|(t|0)==1)V=0;else V=3;q=g>>>0>2&1;r=V;p=0;while(1){if(qb(a,j,q)|0){M=R;N=S;O=1;P=68;break b}f=c[j>>2]|0;if(f>>>0>=g>>>0){M=R;N=S;O=1;P=68;break b}c[d+(p<<2)+144>>2]=f;if(!r)break;else{r=r+-1|0;p=p+1|0}}}if((t|0)==3|(t|0)==2){W=1;X=0}else if((t|0)==0|(t|0)==1){W=0;X=0}else{W=3;X=0}while(1){p=ob(a,k)|0;if(p){M=R;N=S;O=p;P=68;break b}b[d+(X<<2)+160>>1]=c[k>>2];p=ob(a,k)|0;if(p){M=R;N=S;O=p;P=68;break b}b[d+(X<<2)+162>>1]=c[k>>2];if(!W){Q=2;P=70;break}else{W=W+-1|0;X=X+1|0}}}while(0);if((P|0)==68){s=O;i=h;return s|0}do if((P|0)==70){p=pb(a,n,(Q|0)==0&1)|0;if(!p){r=c[n>>2]|0;c[d+4>>2]=r;if(!r)break a;else break}else{s=p;i=h;return s|0}}while(0);p=(ob(a,o)|0)!=0;r=c[o>>2]|0;if(p|(r|0)<-26|(r|0)>25){s=1;i=h;return s|0}c[d+8>>2]=r;r=c[d+4>>2]|0;p=d+272|0;if((c[d>>2]|0)>>>0>=7){q=rb(a,d+1864|0,ib(e,0,p)|0,16)|0;if(!(q&15)){b[d+320>>1]=q>>>4&255;Y=0;P=77}else Z=q}else{Y=1;P=77}e:do if((P|0)==77){q=0;f=r;u=3;while(1){D=f;f=f>>>1;if(!(D&1))_=q+4|0;else{D=q;$=3;while(1){aa=ib(e,D,p)|0;if(Y){ba=rb(a,d+(D<<6)+328|0,aa,16)|0;c[d+(D<<2)+1992>>2]=ba>>>16;ca=ba}else{ba=rb(a,d+(D<<6)+332|0,aa,15)|0;c[d+(D<<2)+1992>>2]=ba>>>15;ca=ba}if(ca&15){Z=ca;break e}b[d+(D<<1)+272>>1]=ca>>>4&255;ba=D+1|0;if(!$){_=ba;break}else{D=ba;$=$+-1|0}}}if(!u)break;else{q=_;u=u+-1|0}}if(f&3){u=rb(a,d+1928|0,-1,4)|0;if(u&15){Z=u;break}b[d+322>>1]=u>>>4&255;u=rb(a,d+1944|0,-1,4)|0;if(u&15){Z=u;break}b[d+324>>1]=u>>>4&255}if(!(f&2))Z=0;else{u=_;q=7;while(1){$=rb(a,d+(u<<6)+332|0,ib(e,u,p)|0,15)|0;if($&15){Z=$;break e}b[d+(u<<1)+272>>1]=$>>>4&255;c[d+(u<<2)+1992>>2]=$>>>15;if(!q){Z=0;break}else{u=u+1|0;q=q+-1|0}}}}while(0);c[a+16>>2]=((c[a+4>>2]|0)-(c[a>>2]|0)<<3)+(c[a+8>>2]|0);if(Z){s=Z;i=h;return s|0}}else{while(1){if(mb(a)|0)break;if(jb(a,1)|0){s=1;P=95;break}}if((P|0)==95){i=h;return s|0}p=0;r=d+328|0;while(1){q=jb(a,8)|0;c[n>>2]=q;if((q|0)==-1){s=1;break}c[r>>2]=q;p=p+1|0;if(p>>>0>=384)break a;else r=r+4|0}i=h;return s|0}while(0);s=0;i=h;return s|0}function cb(a){a=a|0;var b=0;if(a>>>0<6)b=2;else b=(a|0)!=6&1;return b|0}function db(a){a=a|0;var b=0,c=0;b=i;if((a|0)==0|(a|0)==1)c=1;else if((a|0)==3|(a|0)==2)c=2;else c=4;i=b;return c|0}function eb(a){a=a|0;var b=0,c=0;b=i;if(!a)c=1;else if((a|0)==2|(a|0)==1)c=2;else c=4;i=b;return c|0}function fb(a){a=a|0;return a+1&3|0}function gb(d,e,f,g,h,j,k,l){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;m=i;n=c[e>>2]|0;c[d>>2]=n;o=d+196|0;c[o>>2]=(c[o>>2]|0)+1;Na(f,j);if((n|0)==31){p=d+28|0;c[d+20>>2]=0;if((c[o>>2]|0)>>>0>1){b[p>>1]=16;b[d+30>>1]=16;b[d+32>>1]=16;b[d+34>>1]=16;b[d+36>>1]=16;b[d+38>>1]=16;b[d+40>>1]=16;b[d+42>>1]=16;b[d+44>>1]=16;b[d+46>>1]=16;b[d+48>>1]=16;b[d+50>>1]=16;b[d+52>>1]=16;b[d+54>>1]=16;b[d+56>>1]=16;b[d+58>>1]=16;b[d+60>>1]=16;b[d+62>>1]=16;b[d+64>>1]=16;b[d+66>>1]=16;b[d+68>>1]=16;b[d+70>>1]=16;b[d+72>>1]=16;b[d+74>>1]=16;q=0;i=m;return q|0}o=23;r=e+328|0;s=l;t=p;while(1){b[t>>1]=16;a[s>>0]=c[r>>2];a[s+1>>0]=c[r+4>>2];a[s+2>>0]=c[r+8>>2];a[s+3>>0]=c[r+12>>2];a[s+4>>0]=c[r+16>>2];a[s+5>>0]=c[r+20>>2];a[s+6>>0]=c[r+24>>2];a[s+7>>0]=c[r+28>>2];a[s+8>>0]=c[r+32>>2];a[s+9>>0]=c[r+36>>2];a[s+10>>0]=c[r+40>>2];a[s+11>>0]=c[r+44>>2];a[s+12>>0]=c[r+48>>2];a[s+13>>0]=c[r+52>>2];a[s+14>>0]=c[r+56>>2];a[s+15>>0]=c[r+60>>2];if(!o)break;else{o=o+-1|0;r=r+64|0;s=s+16|0;t=t+2|0}}vc(f,l);q=0;i=m;return q|0}t=d+28|0;if(n){kd(t,e+272|0,54);s=c[e+8>>2]|0;r=c[h>>2]|0;do if(s){o=r+s|0;c[h>>2]=o;if((o|0)<0){p=o+52|0;c[h>>2]=p;u=p;break}if((o|0)>51){p=o+-52|0;c[h>>2]=p;u=p}else u=o}else u=r;while(0);r=d+20|0;c[r>>2]=u;s=e+328|0;o=e+1992|0;a:do if((c[d>>2]|0)>>>0<7){p=s;v=o;w=15;x=t;while(1){if(b[x>>1]|0){if(Ga(p,c[r>>2]|0,0,c[v>>2]|0)|0){q=1;break}}else c[p>>2]=16777215;y=p+64|0;z=x+2|0;A=v+4|0;if(!w){B=y;C=A;D=z;break a}else{p=y;v=A;w=w+-1|0;x=z}}i=m;return q|0}else{if(!(b[d+76>>1]|0)){E=s;F=o;G=464;H=15;I=t}else{Ha(e+1864|0,u);E=s;F=o;G=464;H=15;I=t}while(1){x=c[e+(c[G>>2]<<2)+1864>>2]|0;G=G+4|0;c[E>>2]=x;if((x|0)==0?(b[I>>1]|0)==0:0)c[E>>2]=16777215;else J=18;if((J|0)==18?(J=0,(Ga(E,c[r>>2]|0,1,c[F>>2]|0)|0)!=0):0){q=1;break}x=E+64|0;w=I+2|0;v=F+4|0;if(!H){B=x;C=v;D=w;break a}else{E=x;F=v;H=H+-1|0;I=w}}i=m;return q|0}while(0);I=c[192+((Oa(0,51,(c[d+24>>2]|0)+(c[r>>2]|0)|0)|0)<<2)>>2]|0;if((b[d+78>>1]|0)==0?(b[d+80>>1]|0)==0:0){K=B;L=e+1928|0;M=C;N=7;O=D}else{r=e+1928|0;Ia(r,I);K=B;L=r;M=C;N=7;O=D}while(1){D=c[L>>2]|0;L=L+4|0;c[K>>2]=D;if((D|0)==0?(b[O>>1]|0)==0:0)c[K>>2]=16777215;else J=31;if((J|0)==31?(J=0,(Ga(K,I,1,c[M>>2]|0)|0)!=0):0){q=1;J=39;break}if(!N)break;else{K=K+64|0;M=M+4|0;N=N+-1|0;O=O+2|0}}if((J|0)==39){i=m;return q|0}if(n>>>0>=6){n=Nb(d,e,f,j,k,l)|0;if(n){q=n;i=m;return q|0}}else J=37}else{ld(t,0,54);c[d+20>>2]=c[h>>2];J=37}if((J|0)==37?(J=Tb(d,e,g,j,f,l)|0,(J|0)!=0):0){q=J;i=m;return q|0}q=0;i=m;return q|0}function hb(a){a=a|0;return a|0}function ib(d,e,f){d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;h=vb(e)|0;j=wb(e)|0;e=a[h+4>>0]|0;k=a[j+4>>0]|0;l=(c[j>>2]|0)==4;if((c[h>>2]|0)==4){h=b[f+((e&255)<<1)>>1]|0;if(l){m=h+1+(b[f+((k&255)<<1)>>1]|0)>>1;i=g;return m|0}j=d+204|0;if(!(zb(d,c[j>>2]|0)|0)){m=h;i=g;return m|0}m=h+1+(b[(c[j>>2]|0)+((k&255)<<1)+28>>1]|0)>>1;i=g;return m|0}if(l){l=b[f+((k&255)<<1)>>1]|0;f=d+200|0;if(!(zb(d,c[f>>2]|0)|0)){m=l;i=g;return m|0}m=l+1+(b[(c[f>>2]|0)+((e&255)<<1)+28>>1]|0)>>1;i=g;return m|0}f=d+200|0;if(!(zb(d,c[f>>2]|0)|0)){n=0;o=0}else{n=b[(c[f>>2]|0)+((e&255)<<1)+28>>1]|0;o=1}e=d+204|0;if(!(zb(d,c[e>>2]|0)|0)){m=n;i=g;return m|0}d=b[(c[e>>2]|0)+((k&255)<<1)+28>>1]|0;if(!o){m=d;i=g;return m|0}m=n+1+d>>1;i=g;return m|0}function jb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=kb(a)|0;f=a+16|0;g=(c[f>>2]|0)+b|0;c[f>>2]=g;c[a+8>>2]=g&7;if(g>>>0>c[a+12>>2]<<3>>>0){h=-1;i=d;return h|0}c[a+4>>2]=(c[a>>2]|0)+(g>>>3);h=e>>>(32-b|0);i=d;return h|0}function kb(a){a=a|0;var b=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;b=i;e=c[a+4>>2]|0;f=(c[a+12>>2]<<3)-(c[a+16>>2]|0)|0;if((f|0)>31){g=c[a+8>>2]|0;h=(d[e+1>>0]|0)<<16|(d[e>>0]|0)<<24|(d[e+2>>0]|0)<<8|(d[e+3>>0]|0);if(!g){j=h;i=b;return j|0}j=(d[e+4>>0]|0)>>>(8-g|0)|h<<g;i=b;return j|0}if((f|0)<=0){j=0;i=b;return j|0}g=c[a+8>>2]|0;a=g+24|0;h=(d[e>>0]|0)<<a;k=f+-8+g|0;if((k|0)>0){l=e;m=k;n=h;o=a}else{j=h;i=b;return j|0}while(1){l=l+1|0;o=o+-8|0;h=(d[l>>0]|0)<<o|n;m=m+-8|0;if((m|0)<=0){j=h;break}else n=h}i=b;return j|0}function lb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;e=a+16|0;f=(c[e>>2]|0)+b|0;c[e>>2]=f;c[a+8>>2]=f&7;if(f>>>0>c[a+12>>2]<<3>>>0){g=-1;i=d;return g|0}c[a+4>>2]=(c[a>>2]|0)+(f>>>3);g=0;i=d;return g|0}function mb(a){a=a|0;return (c[a+8>>2]|0)==0|0}function nb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=kb(a)|0;do if((e|0)>=0){if(e>>>0>1073741823){if((lb(a,3)|0)==-1){f=1;break}c[b>>2]=(e>>>29&1)+1;f=0;break}if(e>>>0>536870911){if((lb(a,5)|0)==-1){f=1;break}c[b>>2]=(e>>>27&3)+3;f=0;break}if(e>>>0>268435455){if((lb(a,7)|0)==-1){f=1;break}c[b>>2]=(e>>>25&7)+7;f=0;break}g=Ja(e,28)|0;h=g+4|0;if((h|0)!=32){lb(a,g+5|0)|0;g=jb(a,h)|0;if((g|0)==-1){f=1;break}c[b>>2]=(1<<h)+-1+g;f=0;break}c[b>>2]=0;lb(a,32)|0;if((jb(a,1)|0)==1?(g=kb(a)|0,(lb(a,32)|0)!=-1):0)if(!g){c[b>>2]=-1;f=0;break}else if((g|0)==1){c[b>>2]=-1;f=1;break}else{f=1;break}else f=1}else{lb(a,1)|0;c[b>>2]=0;f=0}while(0);i=d;return f|0}function ob(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+16|0;e=d;c[e>>2]=0;f=nb(a,e)|0;a=c[e>>2]|0;e=(f|0)==0;if((a|0)==-1)if(e)g=1;else{c[b>>2]=-2147483648;g=0}else if(e){e=(a+1|0)>>>1;c[b>>2]=(a&1|0)!=0?e:0-e|0;g=0}else g=1;i=d;return g|0}function pb(a,b,e){a=a|0;b=b|0;e=e|0;var f=0,g=0,h=0;f=i;i=i+16|0;g=f;if(nb(a,g)|0){h=1;i=f;return h|0}a=c[g>>2]|0;if(a>>>0>47){h=1;i=f;return h|0}c[b>>2]=d[((e|0)==0?576:528)+a>>0];h=0;i=f;return h|0}function qb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;if(!d){d=jb(a,1)|0;c[b>>2]=d;if((d|0)==-1)f=1;else{c[b>>2]=d^1;f=0}}else f=nb(a,b)|0;i=e;return f|0}function rb(a,b,f,g){a=a|0;b=b|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0;h=i;i=i+128|0;j=h+64|0;k=h;l=kb(a)|0;m=l>>>16;do if(f>>>0<2)if((l|0)>=0){if(l>>>0>201326591){n=e[1264+(l>>>26<<1)>>1]|0;o=25;break}if(l>>>0>16777215){n=e[1328+(l>>>22<<1)>>1]|0;o=25;break}if(l>>>0>2097151){n=e[1424+((l>>>18)+-8<<1)>>1]|0;o=25;break}else{n=e[1536+(m<<1)>>1]|0;o=25;break}}else p=1;else if(f>>>0<4){if((l|0)<0){p=(m&16384|0)!=0?2:2082;break}if(l>>>0>268435455){n=e[1600+(l>>>26<<1)>>1]|0;o=25;break}if(l>>>0>33554431){n=e[1664+(l>>>23<<1)>>1]|0;o=25;break}else{n=e[1728+(l>>>18<<1)>>1]|0;o=25;break}}else{if(f>>>0<8){q=l>>>26;if((q+-8|0)>>>0<56){n=e[1984+(q<<1)>>1]|0;o=25;break}n=e[2112+(l>>>22<<1)>>1]|0;o=25;break}if(f>>>0<17){n=e[2368+(l>>>26<<1)>>1]|0;o=25;break}q=l>>>29;if(q){n=e[2496+(q<<1)>>1]|0;o=25;break}n=e[2512+(l>>>24<<1)>>1]|0;o=25;break}while(0);if((o|0)==25)if(!n){r=1;i=h;return r|0}else p=n;n=p&31;f=l<<n;l=32-n|0;m=p>>>11&31;if(m>>>0>g>>>0){r=1;i=h;return r|0}q=p>>>5&63;do if(m){if(!q){s=l;t=f;u=0}else{do if(l>>>0<q>>>0)if((lb(a,n)|0)==-1){r=1;i=h;return r|0}else{v=32;w=kb(a)|0;break}else{v=l;w=f}while(0);p=w>>>(32-q|0);x=w<<q;y=0;z=1<<q+-1;do{c[j+(y<<2)>>2]=(z&p|0)!=0?-1:1;z=z>>>1;y=y+1|0}while((z|0)!=0);s=v-q|0;t=x;u=y}z=q>>>0<3;a:do if(u>>>0<m>>>0){p=s;A=t;B=u;C=m>>>0>10&z&1;b:while(1){if(p>>>0<16){if((lb(a,32-p|0)|0)==-1){r=1;o=127;break}D=32;E=kb(a)|0}else{D=p;E=A}do if((E|0)>=0)if(E>>>0<=1073741823)if(E>>>0<=536870911)if(E>>>0<=268435455)if(E>>>0<=134217727)if(E>>>0<=67108863)if(E>>>0<=33554431)if(E>>>0<=16777215)if(E>>>0<=8388607)if(E>>>0>4194303){F=9;o=59}else{if(E>>>0>2097151){F=10;o=59;break}if(E>>>0>1048575){F=11;o=59;break}if(E>>>0>524287){F=12;o=59;break}if(E>>>0>262143){F=13;o=59;break}if(E>>>0>131071){G=14;H=E<<15;I=D+-15|0;J=C;K=(C|0)!=0?C:4}else{if(E>>>0<65536){r=1;o=127;break b}G=15;H=E<<16;I=D+-16|0;J=(C|0)!=0?C:1;K=12}L=G<<J;M=H;N=I;O=J;P=K;Q=(J|0)==0;o=60}else{F=8;o=59}else{F=7;o=59}else{F=6;o=59}else{F=5;o=59}else{F=4;o=59}else{F=3;o=59}else{F=2;o=59}else{F=1;o=59}else{F=0;o=59}while(0);if((o|0)==59){o=0;R=F+1|0;S=E<<R;T=D-R|0;R=F<<C;if(!C){U=T;V=S;W=R;X=0;Y=1}else{L=R;M=S;N=T;O=C;P=C;Q=0;o=60}}if((o|0)==60){o=0;if(N>>>0<P>>>0){if((lb(a,32-N|0)|0)==-1){r=1;o=127;break}Z=32;_=kb(a)|0}else{Z=N;_=M}U=Z-P|0;V=_<<P;W=(_>>>(32-P|0))+L|0;X=O;Y=Q}T=(B|0)==(q|0)&z?W+2|0:W;S=(T+2|0)>>>1;R=Y?1:X;c[j+(B<<2)>>2]=(T&1|0)==0?S:0-S|0;B=B+1|0;if(B>>>0>=m>>>0){$=U;aa=V;break a}else{p=U;A=V;C=((S|0)>(3<<R+-1|0)&R>>>0<6&1)+R|0}}if((o|0)==127){i=h;return r|0}}else{$=s;aa=t}while(0);if(m>>>0<g>>>0){do if($>>>0<9)if((lb(a,32-$|0)|0)==-1){r=1;i=h;return r|0}else{ba=32;ca=kb(a)|0;break}else{ba=$;ca=aa}while(0);z=ca>>>23;c:do if((g|0)==4)if((ca|0)>=0)if((m|0)!=3)if(ca>>>0<=1073741823)if((m|0)==2)da=34;else da=ca>>>0>536870911?35:51;else da=18;else da=17;else da=1;else{do switch(m|0){case 8:{ea=d[1056+(ca>>>26)>>0]|0;break}case 12:{ea=d[1232+(ca>>>28)>>0]|0;break}case 13:{ea=d[1248+(ca>>>29)>>0]|0;break}case 14:{ea=d[1256+(ca>>>30)>>0]|0;break}case 6:{ea=d[928+(ca>>>26)>>0]|0;break}case 7:{ea=d[992+(ca>>>26)>>0]|0;break}case 3:{ea=d[800+(ca>>>26)>>0]|0;break}case 4:{ea=d[864+(ca>>>27)>>0]|0;break}case 9:{ea=d[1120+(ca>>>26)>>0]|0;break}case 10:{ea=d[1184+(ca>>>27)>>0]|0;break}case 5:{ea=d[896+(ca>>>27)>>0]|0;break}case 1:{if(ca>>>0>268435455)ea=d[672+(ca>>>27)>>0]|0;else ea=d[704+z>>0]|0;break}case 2:{ea=d[736+(ca>>>26)>>0]|0;break}case 11:{ea=d[1216+(ca>>>28)>>0]|0;break}default:{da=ca>>31&16|1;break c}}while(0);if(!ea){r=1;i=h;return r|0}else da=ea}while(0);z=da&15;fa=ba-z|0;ga=ca<<z;ha=da>>>4&15}else{fa=$;ga=aa;ha=0}z=m+-1|0;y=(z|0)==0;if(y){c[b+(ha<<2)>>2]=c[j+(z<<2)>>2];ia=fa;ja=1<<ha;break}else{ka=fa;la=ga;ma=0;na=ha}d:while(1){if(!na){c[k+(ma<<2)>>2]=1;oa=ka;pa=la;qa=0}else{if(ka>>>0<11){if((lb(a,32-ka|0)|0)==-1){r=1;o=127;break}ra=32;sa=kb(a)|0}else{ra=ka;sa=la}switch(na|0){case 2:{ta=d[632+(sa>>>30)>>0]|0;break}case 3:{ta=d[640+(sa>>>30)>>0]|0;break}case 4:{ta=d[648+(sa>>>29)>>0]|0;break}case 1:{ta=d[624+(sa>>>31)>>0]|0;break}case 5:{ta=d[656+(sa>>>29)>>0]|0;break}case 6:{ta=d[664+(sa>>>29)>>0]|0;break}default:{do if(sa>>>0<=536870911)if(sa>>>0<=268435455)if(sa>>>0<=134217727)if(sa>>>0<=67108863)if(sa>>>0<=33554431)if(sa>>>0>16777215)ua=184;else{if(sa>>>0>8388607){ua=201;break}if(sa>>>0>4194303){ua=218;break}ua=sa>>>0<2097152?0:235}else ua=167;else ua=150;else ua=133;else ua=116;else ua=sa>>>29<<4^115;while(0);if((ua>>>4&15)>>>0>na>>>0){r=1;o=127;break d}else ta=ua}}if(!ta){r=1;o=127;break}x=ta&15;C=ta>>>4&15;c[k+(ma<<2)>>2]=C+1;oa=ra-x|0;pa=sa<<x;qa=na-C|0}ma=ma+1|0;if(ma>>>0>=z>>>0){o=122;break}else{ka=oa;la=pa;na=qa}}if((o|0)==122){c[b+(qa<<2)>>2]=c[j+(z<<2)>>2];C=1<<qa;if(y){ia=oa;ja=C;break}x=m+-2|0;A=C;C=qa;while(1){C=(c[k+(x<<2)>>2]|0)+C|0;p=1<<C|A;c[b+(C<<2)>>2]=c[j+(x<<2)>>2];if(!x){ia=oa;ja=p;break}else{x=x+-1|0;A=p}}}else if((o|0)==127){i=h;return r|0}}else{ia=l;ja=0}while(0);if(lb(a,32-ia|0)|0){r=1;i=h;return r|0}r=ja<<16|m<<4;i=h;return r|0}function sb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;a:do if((jb(a,1)|0)!=-1?(e=b+4|0,c[e>>2]=jb(a,2)|0,f=jb(a,5)|0,c[b>>2]=f,(f+-2|0)>>>0>=3):0){switch(f|0){case 6:case 9:case 10:case 11:case 12:{if(c[e>>2]|0){g=1;break a}break}case 5:case 7:case 8:{if(!(c[e>>2]|0)){g=1;break a}switch(f|0){case 6:case 9:case 10:case 11:case 12:{g=1;break a;break}default:{}}break}default:{}}g=0}else g=1;while(0);i=d;return g|0}function tb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;e=i;if(!d){i=e;return}f=b+-1|0;g=1-b|0;h=~b;j=0;k=0;l=0;while(1){m=(j|0)!=0;if(m)c[a+(k*216|0)+200>>2]=a+((k+-1|0)*216|0);else c[a+(k*216|0)+200>>2]=0;n=(l|0)!=0;if(n){c[a+(k*216|0)+204>>2]=a+((k-b|0)*216|0);if(j>>>0<f>>>0)c[a+(k*216|0)+208>>2]=a+((g+k|0)*216|0);else o=10}else{c[a+(k*216|0)+204>>2]=0;o=10}if((o|0)==10){o=0;c[a+(k*216|0)+208>>2]=0}if(n&m)c[a+(k*216|0)+212>>2]=a+((k+h|0)*216|0);else c[a+(k*216|0)+212>>2]=0;m=j+1|0;n=(m|0)==(b|0);k=k+1|0;if((k|0)==(d|0))break;else{j=n?0:m;l=(n&1)+l|0}}i=e;return}function ub(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;switch(b|0){case 2:{e=c[a+208>>2]|0;break}case 3:{e=c[a+212>>2]|0;break}case 1:{e=c[a+204>>2]|0;break}case 0:{e=c[a+200>>2]|0;break}case 4:{e=a;break}default:e=0}i=d;return e|0}function vb(a){a=a|0;return 3152+(a<<3)|0}function wb(a){a=a|0;return 2960+(a<<3)|0}function xb(a){a=a|0;return 2768+(a<<3)|0}function yb(a){a=a|0;return 2576+(a<<3)|0}function zb(a,b){a=a|0;b=b|0;var d=0;d=i;if(!b){i=d;return 0}else{i=d;return (c[a+4>>2]|0)==(c[b+4>>2]|0)|0}return 0}function Ab(a){a=a|0;var b=0;b=i;ld(a,0,3388);c[a+8>>2]=32;c[a+4>>2]=256;c[a+1332>>2]=1;i=b;return}function Bb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;e=c[b+8>>2]|0;f=a+(e<<2)+20|0;g=c[f>>2]|0;do if(!g){h=id(92)|0;c[f>>2]=h;if(!h){j=65535;i=d;return j|0}}else{h=a+8|0;if((e|0)!=(c[h>>2]|0)){jd(c[g+40>>2]|0);c[(c[f>>2]|0)+40>>2]=0;jd(c[(c[f>>2]|0)+84>>2]|0);c[(c[f>>2]|0)+84>>2]=0;break}k=a+16|0;if(Ra(b,c[k>>2]|0)|0){jd(c[(c[f>>2]|0)+40>>2]|0);c[(c[f>>2]|0)+40>>2]=0;jd(c[(c[f>>2]|0)+84>>2]|0);c[(c[f>>2]|0)+84>>2]=0;c[h>>2]=33;c[a+4>>2]=257;c[k>>2]=0;c[a+12>>2]=0;break}k=b+40|0;jd(c[k>>2]|0);c[k>>2]=0;k=b+84|0;jd(c[k>>2]|0);c[k>>2]=0;j=0;i=d;return j|0}while(0);a=(c[f>>2]|0)+0|0;f=b+0|0;b=a+92|0;do{c[a>>2]=c[f>>2];a=a+4|0;f=f+4|0}while((a|0)<(b|0));j=0;i=d;return j|0}function Cb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0;d=i;e=c[b>>2]|0;f=a+(e<<2)+148|0;g=c[f>>2]|0;do if(!g){h=id(72)|0;c[f>>2]=h;if(!h){j=65535;i=d;return j|0}}else{h=a+4|0;if((e|0)!=(c[h>>2]|0)){jd(c[g+20>>2]|0);c[(c[f>>2]|0)+20>>2]=0;jd(c[(c[f>>2]|0)+24>>2]|0);c[(c[f>>2]|0)+24>>2]=0;jd(c[(c[f>>2]|0)+28>>2]|0);c[(c[f>>2]|0)+28>>2]=0;jd(c[(c[f>>2]|0)+44>>2]|0);c[(c[f>>2]|0)+44>>2]=0;break}if((c[b+4>>2]|0)==(c[a+8>>2]|0))k=g;else{c[h>>2]=257;k=c[f>>2]|0}jd(c[k+20>>2]|0);c[(c[f>>2]|0)+20>>2]=0;jd(c[(c[f>>2]|0)+24>>2]|0);c[(c[f>>2]|0)+24>>2]=0;jd(c[(c[f>>2]|0)+28>>2]|0);c[(c[f>>2]|0)+28>>2]=0;jd(c[(c[f>>2]|0)+44>>2]|0);c[(c[f>>2]|0)+44>>2]=0}while(0);k=(c[f>>2]|0)+0|0;f=b+0|0;b=k+72|0;do{c[k>>2]=c[f>>2];k=k+4|0;f=f+4|0}while((k|0)<(b|0));j=0;i=d;return j|0}function Db(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;e=i;f=a+(b<<2)+148|0;g=c[f>>2]|0;if(!g){h=1;i=e;return h|0}j=c[g+4>>2]|0;k=c[a+(j<<2)+20>>2]|0;if(!k){h=1;i=e;return h|0}l=Kb(g,k)|0;if(l){h=l;i=e;return h|0}l=a+4|0;k=c[l>>2]|0;do if((k|0)!=256){g=a+3380|0;if(!(c[g>>2]|0)){if((k|0)==(b|0))break;m=a+8|0;if((j|0)==(c[m>>2]|0)){c[l>>2]=b;c[a+12>>2]=c[f>>2];break}if(!d){h=1;i=e;return h|0}else{c[l>>2]=b;n=c[f>>2]|0;c[a+12>>2]=n;o=c[n+4>>2]|0;c[m>>2]=o;m=c[a+(o<<2)+20>>2]|0;c[a+16>>2]=m;o=c[m+52>>2]|0;n=c[m+56>>2]|0;c[a+1176>>2]=Z(n,o)|0;c[a+1340>>2]=o;c[a+1344>>2]=n;c[g>>2]=1;break}}c[g>>2]=0;g=a+1212|0;jd(c[g>>2]|0);c[g>>2]=0;n=a+1172|0;jd(c[n>>2]|0);c[n>>2]=0;o=a+1176|0;c[g>>2]=id((c[o>>2]|0)*216|0)|0;m=id(c[o>>2]<<2)|0;c[n>>2]=m;n=c[g>>2]|0;if((n|0)==0|(m|0)==0){h=65535;i=e;return h|0}ld(n,0,(c[o>>2]|0)*216|0);n=a+16|0;tb(c[g>>2]|0,c[(c[n>>2]|0)+52>>2]|0,c[o>>2]|0);o=c[n>>2]|0;do if((c[a+1216>>2]|0)==0?(c[o+16>>2]|0)!=2:0){if(((c[o+80>>2]|0)!=0?(n=c[o+84>>2]|0,(c[n+920>>2]|0)!=0):0)?(c[n+944>>2]|0)==0:0){p=1;break}p=0}else p=1;while(0);n=Z(c[o+56>>2]|0,c[o+52>>2]|0)|0;g=nc(a+1220|0,n,c[o+88>>2]|0,c[o+44>>2]|0,c[o+12>>2]|0,p)|0;if(g){h=g;i=e;return h|0}}else{c[l>>2]=b;g=c[f>>2]|0;c[a+12>>2]=g;n=c[g+4>>2]|0;c[a+8>>2]=n;g=c[a+(n<<2)+20>>2]|0;c[a+16>>2]=g;n=c[g+52>>2]|0;m=c[g+56>>2]|0;c[a+1176>>2]=Z(m,n)|0;c[a+1340>>2]=n;c[a+1344>>2]=m;c[a+3380>>2]=1}while(0);h=0;i=e;return h|0}function Eb(a){a=a|0;var b=0,d=0,e=0;b=i;c[a+1196>>2]=0;c[a+1192>>2]=0;d=c[a+1176>>2]|0;if(!d){i=b;return}e=c[a+1212>>2]|0;a=0;do{c[e+(a*216|0)+4>>2]=0;c[e+(a*216|0)+196>>2]=0;a=a+1|0}while(a>>>0<d>>>0);i=b;return}function Fb(a){a=a|0;return (c[a+1188>>2]|0)==0|0}function Gb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;if(!(c[a+1404>>2]|0)){if((c[a+1196>>2]|0)==(c[a+1176>>2]|0)){d=1;i=b;return d|0}}else{e=c[a+1176>>2]|0;if(!e){d=1;i=b;return d|0}f=c[a+1212>>2]|0;a=0;g=0;do{g=((c[f+(a*216|0)+196>>2]|0)!=0&1)+g|0;a=a+1|0}while(a>>>0<e>>>0);if((g|0)==(e|0)){d=1;i=b;return d|0}}d=0;i=b;return d|0}function Hb(a,b){a=a|0;b=b|0;var d=0,e=0;d=i;e=c[a+16>>2]|0;Lb(c[a+1172>>2]|0,c[a+12>>2]|0,b,c[e+52>>2]|0,c[e+56>>2]|0);i=d;return}function Ib(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;f=i;i=i+32|0;g=f+24|0;h=f+20|0;j=f+16|0;k=f+12|0;l=f+8|0;m=f;c[e>>2]=0;switch(c[b>>2]|0){case 6:case 7:case 8:case 9:case 10:case 11:case 13:case 14:case 15:case 16:case 17:case 18:{c[e>>2]=1;n=0;i=f;return n|0}case 5:case 1:{o=d+1300|0;p=d+1332|0;if(c[p>>2]|0){c[e>>2]=1;c[p>>2]=0}p=Ua(a,g)|0;if(p){n=p;i=f;return n|0}p=c[d+(c[g>>2]<<2)+148>>2]|0;if(!p){n=65520;i=f;return n|0}g=c[p+4>>2]|0;q=c[d+(g<<2)+20>>2]|0;if(!q){n=65520;i=f;return n|0}r=c[d+8>>2]|0;if(!((r|0)==32|(g|0)==(r|0))?(c[b>>2]|0)!=5:0){n=65520;i=f;return n|0}r=c[d+1304>>2]|0;g=c[b+4>>2]|0;if((r|0)!=(g|0)?(r|0)==0|(g|0)==0:0)c[e>>2]=1;g=(c[b>>2]|0)==5;if((c[o>>2]|0)==5){if(!g)s=16}else if(g)s=16;if((s|0)==16)c[e>>2]=1;s=q+12|0;if(Va(a,c[s>>2]|0,h)|0){n=1;i=f;return n|0}g=d+1308|0;r=c[h>>2]|0;if((c[g>>2]|0)!=(r|0)){c[g>>2]=r;c[e>>2]=1}if((c[b>>2]|0)==5){if(Wa(a,c[s>>2]|0,5,j)|0){n=1;i=f;return n|0}if((c[o>>2]|0)==5){s=d+1312|0;r=c[s>>2]|0;g=c[j>>2]|0;if((r|0)==(g|0)){t=r;u=s}else{c[e>>2]=1;t=g;u=s}}else{t=c[j>>2]|0;u=d+1312|0}c[u>>2]=t}t=c[q+16>>2]|0;if(!t){if(Xa(a,q,c[b>>2]|0,k)|0){n=1;i=f;return n|0}u=d+1316|0;j=c[k>>2]|0;if((c[u>>2]|0)!=(j|0)){c[u>>2]=j;c[e>>2]=1}if(c[p+8>>2]|0){j=Ya(a,q,c[b>>2]|0,l)|0;if(j){n=j;i=f;return n|0}j=d+1320|0;u=c[l>>2]|0;if((c[j>>2]|0)!=(u|0)){c[j>>2]=u;c[e>>2]=1}}}else if((t|0)==1?(c[q+24>>2]|0)==0:0){t=p+8|0;p=Za(a,q,c[b>>2]|0,c[t>>2]|0,m)|0;if(p){n=p;i=f;return n|0}p=d+1324|0;q=c[m>>2]|0;if((c[p>>2]|0)!=(q|0)){c[p>>2]=q;c[e>>2]=1}if((c[t>>2]|0)!=0?(t=d+1328|0,d=c[m+4>>2]|0,(c[t>>2]|0)!=(d|0)):0){c[t>>2]=d;c[e>>2]=1}}e=b;b=c[e+4>>2]|0;d=o;c[d>>2]=c[e>>2];c[d+4>>2]=b;n=0;i=f;return n|0}default:{n=0;i=f;return n|0}}return 0}function Jb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;b=i;d=0;while(1){e=c[a+(d<<2)+148>>2]|0;if(((e|0)!=0?(f=c[a+(c[e+4>>2]<<2)+20>>2]|0,(f|0)!=0):0)?(Kb(e,f)|0)==0:0){g=0;h=6;break}d=d+1|0;if(d>>>0>=256){g=1;h=6;break}}if((h|0)==6){i=b;return g|0}return 0}function Kb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;d=i;e=c[b+52>>2]|0;f=Z(c[b+56>>2]|0,e)|0;b=c[a+12>>2]|0;a:do if(b>>>0>1){g=c[a+16>>2]|0;if((g|0)==2){h=c[a+24>>2]|0;j=c[a+28>>2]|0;k=0;while(1){l=c[h+(k<<2)>>2]|0;m=c[j+(k<<2)>>2]|0;if(!(l>>>0<=m>>>0&m>>>0<f>>>0)){n=1;o=15;break}k=k+1|0;if(((l>>>0)%(e>>>0)|0)>>>0>((m>>>0)%(e>>>0)|0)>>>0){n=1;o=15;break}if(k>>>0>=(b+-1|0)>>>0)break a}if((o|0)==15){i=d;return n|0}}else if(!g){k=c[a+20>>2]|0;j=0;while(1){if((c[k+(j<<2)>>2]|0)>>>0>f>>>0){n=1;break}j=j+1|0;if(j>>>0>=b>>>0)break a}i=d;return n|0}else{if((g+-3|0)>>>0<3){if((c[a+36>>2]|0)>>>0>f>>>0)n=1;else break;i=d;return n|0}if((g|0)!=6)break;if((c[a+40>>2]|0)>>>0<f>>>0)n=1;else break;i=d;return n|0}}while(0);n=0;i=d;return n|0}function Lb(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;g=i;h=Z(f,e)|0;j=c[b+12>>2]|0;if((j|0)==1){ld(a,0,h<<2);i=g;return}k=c[b+16>>2]|0;if((k+-3|0)>>>0<3){l=Z(c[b+36>>2]|0,d)|0;d=l>>>0<h>>>0?l:h;if((k&-2|0)==4){m=(c[b+32>>2]|0)==0?d:h-d|0;n=d}else{m=0;n=d}}else{m=0;n=0}switch(k|0){case 0:{k=c[b+20>>2]|0;d=0;l=0;a:while(1){o=l>>>0<h>>>0;p=d;while(1){if(p>>>0<j>>>0&o)break;if(o)p=0;else break a}o=k+(p<<2)|0;q=c[o>>2]|0;b:do if(!q)r=0;else{s=q;t=0;while(1){u=t+l|0;if(u>>>0>=h>>>0){r=s;break b}c[a+(u<<2)>>2]=p;t=t+1|0;u=c[o>>2]|0;if(t>>>0>=u>>>0){r=u;break}else s=u}}while(0);d=p+1|0;l=r+l|0}i=g;return}case 1:{if(!h){i=g;return}else v=0;do{c[a+(v<<2)>>2]=((((Z((v>>>0)/(e>>>0)|0,j)|0)>>>1)+((v>>>0)%(e>>>0)|0)|0)>>>0)%(j>>>0)|0;v=v+1|0}while((v|0)!=(h|0));i=g;return}case 3:{v=c[b+32>>2]|0;if(h){l=0;do{c[a+(l<<2)>>2]=1;l=l+1|0}while((l|0)!=(h|0))}l=(e-v|0)>>>1;r=(f-v|0)>>>1;if(!n){i=g;return}d=v<<1;k=d+-1|0;o=e+-1|0;q=1-d|0;d=f+-1|0;s=r;t=0;u=l;w=l;x=r;y=l;l=v+-1|0;z=r;r=v;while(1){v=a+((Z(z,e)|0)+y<<2)|0;A=(c[v>>2]|0)==1;B=A&1;if(A)c[v>>2]=0;do if(!((l|0)==-1&(y|0)==(u|0))){if((l|0)==1&(y|0)==(w|0)){v=w+1|0;A=(v|0)<(o|0)?v:o;C=s;D=u;E=A;F=x;G=A;H=0;I=z;J=q;break}if((r|0)==-1&(z|0)==(x|0)){A=x+-1|0;v=(A|0)>0?A:0;C=s;D=u;E=w;F=v;G=y;H=q;I=v;J=0;break}if((r|0)==1&(z|0)==(s|0)){v=s+1|0;A=(v|0)<(d|0)?v:d;C=A;D=u;E=w;F=x;G=y;H=k;I=A;J=0;break}else{C=s;D=u;E=w;F=x;G=y+l|0;H=l;I=z+r|0;J=r;break}}else{A=u+-1|0;v=(A|0)>0?A:0;C=s;D=v;E=w;F=x;G=v;H=0;I=z;J=k}while(0);t=B+t|0;if(t>>>0>=n>>>0)break;else{s=C;u=D;w=E;x=F;y=G;l=H;z=I;r=J}}i=g;return}case 5:{J=c[b+32>>2]|0;if(!e){i=g;return}r=(f|0)==0;I=1-J|0;z=0;H=0;while(1){if(r)K=H;else{l=0;G=H;while(1){y=a+((Z(l,e)|0)+z<<2)|0;c[y>>2]=G>>>0<m>>>0?J:I;l=l+1|0;if((l|0)==(f|0))break;else G=G+1|0}K=H+f|0}z=z+1|0;if((z|0)==(e|0))break;else H=K}i=g;return}case 4:{K=c[b+32>>2]|0;if(!h){i=g;return}H=1-K|0;z=0;do{c[a+(z<<2)>>2]=z>>>0<m>>>0?K:H;z=z+1|0}while((z|0)!=(h|0));i=g;return}case 2:{z=c[b+24>>2]|0;H=c[b+28>>2]|0;K=j+-1|0;if(h){m=0;do{c[a+(m<<2)>>2]=K;m=m+1|0}while((m|0)!=(h|0))}if(!K){i=g;return}K=j+-2|0;while(1){j=c[z+(K<<2)>>2]|0;m=(j>>>0)/(e>>>0)|0;f=(j>>>0)%(e>>>0)|0;j=c[H+(K<<2)>>2]|0;I=(j>>>0)/(e>>>0)|0;J=(j>>>0)%(e>>>0)|0;if(m>>>0<=I>>>0){j=f>>>0>J>>>0;r=m;do{if(!j){m=Z(r,e)|0;G=f;do{c[a+(G+m<<2)>>2]=K;G=G+1|0}while(G>>>0<=J>>>0)}r=r+1|0}while(r>>>0<=I>>>0)}if(!K)break;else K=K+-1|0}i=g;return}default:{if(!h){i=g;return}K=c[b+44>>2]|0;b=0;do{c[a+(b<<2)>>2]=c[K+(b<<2)>>2];b=b+1|0}while((b|0)!=(h|0));i=g;return}}}function Mb(){return 3472}function Nb(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;h=i;i=i+80|0;j=h+32|0;k=h;Ob(d,j,k,e);if((cb(c[a>>2]|0)|0)==1){e=Pb(a,g,b+328|0,j,k,f)|0;if(e){l=e;i=h;return l|0}}else{e=Qb(a,g,b,j,k,f)|0;if(e){l=e;i=h;return l|0}}e=Rb(a,g+256|0,b+1352|0,j+21|0,k+16|0,c[b+140>>2]|0,f)|0;if(e){l=e;i=h;return l|0}if((c[a+196>>2]|0)>>>0>1){l=0;i=h;return l|0}vc(d,g);l=0;i=h;return l|0}function Ob(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;g=i;if(!f){i=g;return}h=c[b+4>>2]|0;j=Z(c[b+8>>2]|0,h)|0;k=(f>>>0)/(h>>>0)|0;l=Z(k,h)|0;m=f-l|0;n=h<<4;o=c[b>>2]|0;p=(m<<4)+(Z(h<<8,k)|0)|0;q=(k|0)!=0;if(q){r=p-(n|1)|0;a[d>>0]=a[o+r>>0]|0;a[d+1>>0]=a[o+(r+1)>>0]|0;a[d+2>>0]=a[o+(r+2)>>0]|0;a[d+3>>0]=a[o+(r+3)>>0]|0;a[d+4>>0]=a[o+(r+4)>>0]|0;a[d+5>>0]=a[o+(r+5)>>0]|0;a[d+6>>0]=a[o+(r+6)>>0]|0;a[d+7>>0]=a[o+(r+7)>>0]|0;a[d+8>>0]=a[o+(r+8)>>0]|0;a[d+9>>0]=a[o+(r+9)>>0]|0;a[d+10>>0]=a[o+(r+10)>>0]|0;a[d+11>>0]=a[o+(r+11)>>0]|0;a[d+12>>0]=a[o+(r+12)>>0]|0;a[d+13>>0]=a[o+(r+13)>>0]|0;a[d+14>>0]=a[o+(r+14)>>0]|0;a[d+15>>0]=a[o+(r+15)>>0]|0;a[d+16>>0]=a[o+(r+16)>>0]|0;a[d+17>>0]=a[o+(r+17)>>0]|0;a[d+18>>0]=a[o+(r+18)>>0]|0;a[d+19>>0]=a[o+(r+19)>>0]|0;a[d+20>>0]=a[o+(r+20)>>0]|0;s=d+21|0}else s=d;d=(l|0)!=(f|0);if(d){f=p+-1|0;a[e>>0]=a[o+f>>0]|0;p=f+n|0;a[e+1>>0]=a[o+p>>0]|0;f=p+n|0;a[e+2>>0]=a[o+f>>0]|0;p=f+n|0;a[e+3>>0]=a[o+p>>0]|0;f=p+n|0;a[e+4>>0]=a[o+f>>0]|0;p=f+n|0;a[e+5>>0]=a[o+p>>0]|0;f=p+n|0;a[e+6>>0]=a[o+f>>0]|0;p=f+n|0;a[e+7>>0]=a[o+p>>0]|0;f=p+n|0;a[e+8>>0]=a[o+f>>0]|0;p=f+n|0;a[e+9>>0]=a[o+p>>0]|0;f=p+n|0;a[e+10>>0]=a[o+f>>0]|0;p=f+n|0;a[e+11>>0]=a[o+p>>0]|0;f=p+n|0;a[e+12>>0]=a[o+f>>0]|0;p=f+n|0;a[e+13>>0]=a[o+p>>0]|0;f=p+n|0;a[e+14>>0]=a[o+f>>0]|0;a[e+15>>0]=a[o+(f+n)>>0]|0;t=e+16|0}else t=e;e=h<<3&2147483640;n=c[b>>2]|0;b=(Z(k<<3,e)|0)+(j<<8)+(m<<3)|0;if(q){q=b-(e|1)|0;a[s>>0]=a[n+q>>0]|0;a[s+1>>0]=a[n+(q+1)>>0]|0;a[s+2>>0]=a[n+(q+2)>>0]|0;a[s+3>>0]=a[n+(q+3)>>0]|0;a[s+4>>0]=a[n+(q+4)>>0]|0;a[s+5>>0]=a[n+(q+5)>>0]|0;a[s+6>>0]=a[n+(q+6)>>0]|0;a[s+7>>0]=a[n+(q+7)>>0]|0;a[s+8>>0]=a[n+(q+8)>>0]|0;m=q+(j<<6)|0;a[s+9>>0]=a[n+m>>0]|0;a[s+10>>0]=a[n+(m+1)>>0]|0;a[s+11>>0]=a[n+(m+2)>>0]|0;a[s+12>>0]=a[n+(m+3)>>0]|0;a[s+13>>0]=a[n+(m+4)>>0]|0;a[s+14>>0]=a[n+(m+5)>>0]|0;a[s+15>>0]=a[n+(m+6)>>0]|0;a[s+16>>0]=a[n+(m+7)>>0]|0;a[s+17>>0]=a[n+(m+8)>>0]|0}if(!d){i=g;return}d=b+-1|0;a[t>>0]=a[n+d>>0]|0;b=d+e|0;a[t+1>>0]=a[n+b>>0]|0;d=b+e|0;a[t+2>>0]=a[n+d>>0]|0;b=d+e|0;a[t+3>>0]=a[n+b>>0]|0;d=b+e|0;a[t+4>>0]=a[n+d>>0]|0;b=d+e|0;a[t+5>>0]=a[n+b>>0]|0;d=b+e|0;a[t+6>>0]=a[n+d>>0]|0;b=d+e|0;a[t+7>>0]=a[n+b>>0]|0;d=b+(e+((j<<6)-(h<<6)))|0;a[t+8>>0]=a[n+d>>0]|0;h=d+e|0;a[t+9>>0]=a[n+h>>0]|0;d=h+e|0;a[t+10>>0]=a[n+d>>0]|0;h=d+e|0;a[t+11>>0]=a[n+h>>0]|0;d=h+e|0;a[t+12>>0]=a[n+d>>0]|0;h=d+e|0;a[t+13>>0]=a[n+h>>0]|0;d=h+e|0;a[t+14>>0]=a[n+d>>0]|0;a[t+15>>0]=a[n+(d+e)>>0]|0;i=g;return}function Pb(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;k=i;l=b+200|0;m=zb(b,c[l>>2]|0)|0;n=(j|0)!=0;if((m|0)!=0&n){j=(cb(c[c[l>>2]>>2]|0)|0)==2;o=j?0:m}else o=m;m=b+204|0;j=zb(b,c[m>>2]|0)|0;if((j|0)!=0&n){l=(cb(c[c[m>>2]>>2]|0)|0)==2;p=l?0:j}else p=j;j=b+212|0;l=zb(b,c[j>>2]|0)|0;if((l|0)!=0&n){n=(cb(c[c[j>>2]>>2]|0)|0)==2;q=n?0:l}else q=l;l=fb(c[b>>2]|0)|0;if(!l){if(!p){r=1;i=k;return r|0}b=g+1|0;n=g+2|0;j=g+3|0;m=g+4|0;s=g+5|0;t=g+6|0;u=g+7|0;v=g+8|0;w=g+9|0;x=g+10|0;y=g+11|0;z=g+12|0;A=g+13|0;B=g+14|0;C=g+15|0;D=g+16|0;E=e;F=0;while(1){a[E>>0]=a[b>>0]|0;a[E+1>>0]=a[n>>0]|0;a[E+2>>0]=a[j>>0]|0;a[E+3>>0]=a[m>>0]|0;a[E+4>>0]=a[s>>0]|0;a[E+5>>0]=a[t>>0]|0;a[E+6>>0]=a[u>>0]|0;a[E+7>>0]=a[v>>0]|0;a[E+8>>0]=a[w>>0]|0;a[E+9>>0]=a[x>>0]|0;a[E+10>>0]=a[y>>0]|0;a[E+11>>0]=a[z>>0]|0;a[E+12>>0]=a[A>>0]|0;a[E+13>>0]=a[B>>0]|0;a[E+14>>0]=a[C>>0]|0;a[E+15>>0]=a[D>>0]|0;F=F+1|0;if((F|0)==16)break;else E=E+16|0}}else if((l|0)==1)if(!o){r=1;i=k;return r|0}else{E=e;F=0;while(1){D=h+F|0;a[E>>0]=a[D>>0]|0;a[E+1>>0]=a[D>>0]|0;a[E+2>>0]=a[D>>0]|0;a[E+3>>0]=a[D>>0]|0;a[E+4>>0]=a[D>>0]|0;a[E+5>>0]=a[D>>0]|0;a[E+6>>0]=a[D>>0]|0;a[E+7>>0]=a[D>>0]|0;a[E+8>>0]=a[D>>0]|0;a[E+9>>0]=a[D>>0]|0;a[E+10>>0]=a[D>>0]|0;a[E+11>>0]=a[D>>0]|0;a[E+12>>0]=a[D>>0]|0;a[E+13>>0]=a[D>>0]|0;a[E+14>>0]=a[D>>0]|0;a[E+15>>0]=a[D>>0]|0;F=F+1|0;if((F|0)==16)break;else E=E+16|0}}else if((l|0)==2){l=g+1|0;E=(o|0)!=0;F=(p|0)!=0;do if(!(E&F)){if(E){G=((d[h>>0]|0)+8+(d[h+1>>0]|0)+(d[h+2>>0]|0)+(d[h+3>>0]|0)+(d[h+4>>0]|0)+(d[h+5>>0]|0)+(d[h+6>>0]|0)+(d[h+7>>0]|0)+(d[h+8>>0]|0)+(d[h+9>>0]|0)+(d[h+10>>0]|0)+(d[h+11>>0]|0)+(d[h+12>>0]|0)+(d[h+13>>0]|0)+(d[h+14>>0]|0)+(d[h+15>>0]|0)|0)>>>4;break}if(F)G=((d[l>>0]|0)+8+(d[g+2>>0]|0)+(d[g+3>>0]|0)+(d[g+4>>0]|0)+(d[g+5>>0]|0)+(d[g+6>>0]|0)+(d[g+7>>0]|0)+(d[g+8>>0]|0)+(d[g+9>>0]|0)+(d[g+10>>0]|0)+(d[g+11>>0]|0)+(d[g+12>>0]|0)+(d[g+13>>0]|0)+(d[g+14>>0]|0)+(d[g+15>>0]|0)+(d[g+16>>0]|0)|0)>>>4;else G=128}else{D=0;C=0;do{B=D;D=D+1|0;C=(d[g+D>>0]|0)+C+(d[h+B>>0]|0)|0}while((D|0)!=16);G=(C+16|0)>>>5}while(0);qd(e|0,G&255|0,256)|0}else{if(!((o|0)!=0&(p|0)!=0&(q|0)!=0)){r=1;i=k;return r|0}q=d[g+16>>0]|0;p=d[h+15>>0]|0;o=d[g>>0]|0;G=(((d[g+9>>0]|0)-(d[g+7>>0]|0)+((d[g+10>>0]|0)-(d[g+6>>0]|0)<<1)+(((d[g+11>>0]|0)-(d[g+5>>0]|0)|0)*3|0)+((d[g+12>>0]|0)-(d[g+4>>0]|0)<<2)+(((d[g+13>>0]|0)-(d[g+3>>0]|0)|0)*5|0)+(((d[g+14>>0]|0)-(d[g+2>>0]|0)|0)*6|0)+(((d[g+15>>0]|0)-(d[g+1>>0]|0)|0)*7|0)+(q-o<<3)|0)*5|0)+32>>6;g=(((d[h+8>>0]|0)-(d[h+6>>0]|0)+(p-o<<3)+((d[h+9>>0]|0)-(d[h+5>>0]|0)<<1)+(((d[h+10>>0]|0)-(d[h+4>>0]|0)|0)*3|0)+((d[h+11>>0]|0)-(d[h+3>>0]|0)<<2)+(((d[h+12>>0]|0)-(d[h+2>>0]|0)|0)*5|0)+(((d[h+13>>0]|0)-(d[h+1>>0]|0)|0)*6|0)+(((d[h+14>>0]|0)-(d[h>>0]|0)|0)*7|0)|0)*5|0)+32>>6;h=(p+q<<4)+16|0;q=0;do{p=h+(Z(q+-7|0,g)|0)|0;o=q<<4;l=0;do{F=p+(Z(l+-7|0,G)|0)>>5;if((F|0)<0)H=0;else H=(F|0)>255?-1:F&255;a[e+(l+o)>>0]=H;l=l+1|0}while((l|0)!=16);q=q+1|0}while((q|0)!=16)}Sb(e,f,0);Sb(e,f+64|0,1);Sb(e,f+128|0,2);Sb(e,f+192|0,3);Sb(e,f+256|0,4);Sb(e,f+320|0,5);Sb(e,f+384|0,6);Sb(e,f+448|0,7);Sb(e,f+512|0,8);Sb(e,f+576|0,9);Sb(e,f+640|0,10);Sb(e,f+704|0,11);Sb(e,f+768|0,12);Sb(e,f+832|0,13);Sb(e,f+896|0,14);Sb(e,f+960|0,15);r=0;i=k;return r|0}function Qb(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0;k=i;l=(j|0)!=0;j=0;a:while(1){m=vb(j)|0;n=c[m+4>>2]|0;o=ub(b,c[m>>2]|0)|0;m=zb(b,o)|0;if((m|0)!=0&l){p=(cb(c[o>>2]|0)|0)==2;q=p?0:m}else q=m;m=wb(j)|0;p=c[m+4>>2]|0;r=ub(b,c[m>>2]|0)|0;m=zb(b,r)|0;if((m|0)!=0&l){s=(cb(c[r>>2]|0)|0)==2;t=s?0:m}else t=m;m=(q|0)!=0;s=(t|0)!=0;u=m&s;if(u){if(!(cb(c[o>>2]|0)|0))v=d[o+(n&255)+82>>0]|0;else v=2;if(!(cb(c[r>>2]|0)|0))w=d[r+(p&255)+82>>0]|0;else w=2;x=v>>>0<w>>>0?v:w}else x=2;if(!(c[f+(j<<2)+12>>2]|0)){p=c[f+(j<<2)+76>>2]|0;y=(p>>>0>=x>>>0&1)+p|0}else y=x;a[b+j+82>>0]=y;p=c[(xb(j)|0)>>2]|0;r=ub(b,p)|0;p=zb(b,r)|0;if((p|0)!=0&l){n=(cb(c[r>>2]|0)|0)==2;z=n?0:p}else z=p;p=c[(yb(j)|0)>>2]|0;n=ub(b,p)|0;p=zb(b,n)|0;if((p|0)!=0&l){r=(cb(c[n>>2]|0)|0)==2;A=r?0:p}else A=p;p=c[3344+(j<<2)>>2]|0;r=c[3408+(j<<2)>>2]|0;n=(1285>>>j&1|0)!=0;if(n){B=h+r|0;C=h+(r+1)|0;D=h+(r+2)|0;E=h+(r+3)|0}else{o=(r<<4)+p|0;B=e+(o+-1)|0;C=e+(o+15)|0;D=e+(o+31)|0;E=e+(o+47)|0}o=a[B>>0]|0;F=a[C>>0]|0;G=a[D>>0]|0;H=a[E>>0]|0;do if(!(51>>>j&1)){I=r+-1|0;J=(I<<4)+p|0;K=a[e+J>>0]|0;L=a[e+(J+1)>>0]|0;M=a[e+(J+2)>>0]|0;N=a[e+(J+3)>>0]|0;O=a[e+(J+4)>>0]|0;P=a[e+(J+5)>>0]|0;Q=a[e+(J+6)>>0]|0;R=a[e+(J+7)>>0]|0;if(n){S=Q;T=N;U=O;V=P;W=K;X=R;Y=L;_=M;$=h+I|0;break}else{S=Q;T=N;U=O;V=P;W=K;X=R;Y=L;_=M;$=e+(J+-1)|0;break}}else{S=a[g+(p+7)>>0]|0;T=a[g+(p+4)>>0]|0;U=a[g+(p+5)>>0]|0;V=a[g+(p+6)>>0]|0;W=a[g+(p+1)>>0]|0;X=a[g+(p+8)>>0]|0;Y=a[g+(p+2)>>0]|0;_=a[g+(p+3)>>0]|0;$=g+p|0}while(0);n=a[$>>0]|0;switch(y|0){case 5:{if(!(u&(A|0)!=0)){aa=1;ba=51;break a}J=n&255;M=W&255;L=(M+1+J|0)>>>1&255;R=Y&255;K=(R+2+(M<<1)+J|0)>>>2;P=o&255;O=M+2|0;N=(O+P+(J<<1)|0)>>>2;Q=(R+1+M|0)>>>1&255;M=_&255;I=((R<<1)+M+O|0)>>>2;O=(M+1+R|0)>>>1&255;ca=T&255;da=F&255;ea=L;fa=N&255;ga=(da+2+(P<<1)+J|0)>>>2&255;ha=Q;ia=O;ja=(ca+1+M|0)>>>1&255;ka=K&255;la=I&255;ma=(ca+2+R+(M<<1)|0)>>>2&255;na=L;oa=Q;pa=O;qa=I<<24|(P+2+(G&255)+(da<<1)|0)>>>2&255|K<<16&16711680|N<<8&65280;break}case 1:{if(!m){aa=1;ba=51;break a}N=Z(o&255,16843009)|0;K=Z(F&255,16843009)|0;da=Z(G&255,16843009)|0;ea=N&255;fa=K&255;ga=da&255;ha=N>>>8&255;ia=N>>>16&255;ja=N>>>24&255;ka=K>>>8&255;la=K>>>16&255;ma=K>>>24&255;na=da>>>8&255;oa=da>>>16&255;pa=da>>>24&255;qa=Z(H&255,16843009)|0;break}case 6:{if(!(u&(A|0)!=0)){aa=1;ba=51;break a}da=n&255;K=o&255;N=K+1|0;P=(N+da|0)>>>1&255;I=F&255;O=((K<<1)+2+I+da|0)>>>2&255;Q=(N+I|0)>>>1&255;N=G&255;L=K+2|0;K=(L+(I<<1)+N|0)>>>2;M=(I+1+N|0)>>>1;R=H&255;ca=W&255;J=(L+ca+(da<<1)|0)>>>2&255;L=Y&255;ea=P;fa=Q;ga=M&255;ha=J;ia=(L+2+(ca<<1)+da|0)>>>2&255;ja=((_&255)+2+(L<<1)+ca|0)>>>2&255;ka=O;la=P;ma=J;na=K&255;oa=Q;pa=O;qa=K<<24|M<<16&16711680|(N+1+R|0)>>>1&255|I+2+(N<<1)+R<<6&65280;break}case 7:{if(!t){aa=1;ba=51;break a}R=(z|0)==0;N=W&255;I=Y&255;M=_&255;K=(M+1+I|0)>>>1&255;O=T&255;Q=O+1|0;J=(Q+M|0)>>>1&255;P=(R?T:U)&255;ca=(Q+P|0)>>>1&255;Q=M+2|0;L=O+2|0;da=(L+I+(M<<1)|0)>>>2;M=(Q+(O<<1)+P|0)>>>2;O=(R?T:V)&255;ra=(L+O+(P<<1)|0)>>>2;ea=(I+1+N|0)>>>1&255;fa=(Q+N+(I<<1)|0)>>>2&255;ga=K;ha=K;ia=J;ja=ca;ka=da&255;la=M&255;ma=ra&255;na=J;oa=ca;pa=(P+1+O|0)>>>1&255;qa=ra<<16&16711680|da&255|(P+2+((R?T:S)&255)+(O<<1)|0)>>>2<<24|M<<8&65280;break}case 2:{do if(!u){if(m){sa=((o&255)+2+(F&255)+(G&255)+(H&255)|0)>>>2;break}if(s)sa=((T&255)+2+(_&255)+(Y&255)+(W&255)|0)>>>2;else sa=128}else sa=((o&255)+4+(F&255)+(G&255)+(H&255)+(T&255)+(_&255)+(Y&255)+(W&255)|0)>>>3;while(0);s=Z(sa&255,16843009)|0;M=s&255;O=s>>>8&255;R=s>>>16&255;P=s>>>24&255;ea=M;fa=M;ga=M;ha=O;ia=R;ja=P;ka=O;la=R;ma=P;na=O;oa=R;pa=P;qa=s;break}case 3:{if(!t){aa=1;ba=51;break a}s=(z|0)==0;P=Y&255;R=_&255;O=R+2|0;M=T&255;da=M+2|0;ra=(da+P+(R<<1)|0)>>>2&255;R=(s?T:U)&255;ca=(O+(M<<1)+R|0)>>>2&255;M=(s?T:V)&255;J=(da+M+(R<<1)|0)>>>2;da=J&255;K=(s?T:S)&255;I=(R+2+K+(M<<1)|0)>>>2;R=I&255;N=(s?T:X)&255;s=(M+2+N+(K<<1)|0)>>>2;ea=(O+(W&255)+(P<<1)|0)>>>2&255;fa=ra;ga=ca;ha=ra;ia=ca;ja=da;ka=ca;la=da;ma=R;na=da;oa=R;pa=s&255;qa=(K+2+(N*3|0)|0)>>>2<<24|J&255|I<<8&65280|s<<16&16711680;break}case 0:{if(!t){aa=1;ba=51;break a}ea=W;fa=W;ga=W;ha=Y;ia=_;ja=T;ka=Y;la=_;ma=T;na=Y;oa=_;pa=T;qa=(_&255)<<16|(T&255)<<24|(Y&255)<<8|W&255;break}case 4:{if(!(u&(A|0)!=0)){aa=1;ba=51;break a}s=W&255;I=n&255;J=o&255;N=s+2|0;K=(N+J+(I<<1)|0)>>>2;R=K&255;da=Y&255;ca=I+2|0;I=((s<<1)+da+ca|0)>>>2&255;s=_&255;ra=((da<<1)+s+N|0)>>>2&255;N=F&255;P=(N+(J<<1)+ca|0)>>>2;ca=P&255;O=G&255;M=(J+2+(N<<1)+O|0)>>>2;ea=R;fa=ca;ga=M&255;ha=I;ia=ra;ja=((T&255)+2+da+(s<<1)|0)>>>2&255;ka=R;la=I;ma=ra;na=ca;oa=R;pa=I;qa=(N+2+(O<<1)+(H&255)|0)>>>2&255|M<<8&65280|K<<24|P<<16&16711680;break}default:{if(!m){aa=1;ba=51;break a}P=o&255;K=F&255;M=G&255;O=(K+1+M|0)>>>1&255;N=H&255;I=(K+2+(M<<1)+N|0)>>>2&255;R=(M+1+N|0)>>>1&255;ca=(M+2+(N*3|0)|0)>>>2&255;ea=(P+1+K|0)>>>1&255;fa=O;ga=R;ha=(P+2+(K<<1)+M|0)>>>2&255;ia=O;ja=I;ka=I;la=R;ma=ca;na=ca;oa=H;pa=H;qa=N<<8|N|N<<16|N<<24}}N=(r<<4)+p|0;c[e+N>>2]=(ia&255)<<16|(ja&255)<<24|(ha&255)<<8|ea&255;c[e+(N+16)>>2]=(la&255)<<16|(ma&255)<<24|(ka&255)<<8|fa&255;c[e+(N+32)>>2]=(oa&255)<<16|(pa&255)<<24|(na&255)<<8|ga&255;c[e+(N+48)>>2]=qa;Sb(e,f+(j<<6)+328|0,j);j=j+1|0;if(j>>>0>=16){aa=0;ba=51;break}}if((ba|0)==51){i=k;return aa|0}return 0}function Rb(b,e,f,g,h,j,k){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;l=i;m=b+200|0;n=zb(b,c[m>>2]|0)|0;o=(k|0)!=0;if((n|0)!=0&o){k=(cb(c[c[m>>2]>>2]|0)|0)==2;p=k?0:n}else p=n;n=b+204|0;k=zb(b,c[n>>2]|0)|0;if((k|0)!=0&o){m=(cb(c[c[n>>2]>>2]|0)|0)==2;q=m?0:k}else q=k;k=b+212|0;m=zb(b,c[k>>2]|0)|0;if((m|0)!=0&o){o=(cb(c[c[k>>2]>>2]|0)|0)==2;r=o?0:m}else r=m;m=(p|0)!=0;o=(q|0)!=0;k=m&o;b=k&(r|0)!=0;r=(p|0)==0;p=(q|0)==0;q=g;g=16;n=0;s=e;e=h;h=f;while(1){if((j|0)==1){if(r){t=1;u=29;break}else{v=s;w=8;x=e}while(1){w=w+-1|0;a[v>>0]=a[x>>0]|0;a[v+1>>0]=a[x>>0]|0;a[v+2>>0]=a[x>>0]|0;a[v+3>>0]=a[x>>0]|0;a[v+4>>0]=a[x>>0]|0;a[v+5>>0]=a[x>>0]|0;a[v+6>>0]=a[x>>0]|0;a[v+7>>0]=a[x>>0]|0;if(!w)break;else{v=v+8|0;x=x+1|0}}}else if(!j){f=q+1|0;do if(!k){if(o){y=((d[f>>0]|0)+2+(d[q+2>>0]|0)+(d[q+3>>0]|0)+(d[q+4>>0]|0)|0)>>>2;z=((d[q+5>>0]|0)+2+(d[q+6>>0]|0)+(d[q+7>>0]|0)+(d[q+8>>0]|0)|0)>>>2;break}if(m){A=((d[e>>0]|0)+2+(d[e+1>>0]|0)+(d[e+2>>0]|0)+(d[e+3>>0]|0)|0)>>>2;y=A;z=A}else{y=128;z=128}}else{y=((d[f>>0]|0)+4+(d[q+2>>0]|0)+(d[q+3>>0]|0)+(d[q+4>>0]|0)+(d[e>>0]|0)+(d[e+1>>0]|0)+(d[e+2>>0]|0)+(d[e+3>>0]|0)|0)>>>3;z=((d[q+5>>0]|0)+2+(d[q+6>>0]|0)+(d[q+7>>0]|0)+(d[q+8>>0]|0)|0)>>>2}while(0);A=y&255;B=z&255;qd(s|0,A|0,4)|0;qd(s+4|0,B|0,4)|0;qd(s+8|0,A|0,4)|0;qd(s+12|0,B|0,4)|0;qd(s+16|0,A|0,4)|0;qd(s+20|0,B|0,4)|0;C=s+32|0;qd(s+24|0,A|0,4)|0;qd(s+28|0,B|0,4)|0;if(m){B=d[e+4>>0]|0;A=d[e+5>>0]|0;D=d[e+6>>0]|0;E=d[e+7>>0]|0;F=(B+2+A+D+E|0)>>>2;if(o){G=F;H=(B+4+A+D+E+(d[q+5>>0]|0)+(d[q+6>>0]|0)+(d[q+7>>0]|0)+(d[q+8>>0]|0)|0)>>>3}else{G=F;H=F}}else if(o){G=((d[f>>0]|0)+2+(d[q+2>>0]|0)+(d[q+3>>0]|0)+(d[q+4>>0]|0)|0)>>>2;H=((d[q+5>>0]|0)+2+(d[q+6>>0]|0)+(d[q+7>>0]|0)+(d[q+8>>0]|0)|0)>>>2}else{G=128;H=128}F=G&255;E=H&255;qd(C|0,F|0,4)|0;qd(s+36|0,E|0,4)|0;qd(s+40|0,F|0,4)|0;qd(s+44|0,E|0,4)|0;qd(s+48|0,F|0,4)|0;qd(s+52|0,E|0,4)|0;qd(s+56|0,F|0,4)|0;qd(s+60|0,E|0,4)|0}else if((j|0)==2){if(p){t=1;u=29;break}else{I=q;J=s;K=8}while(1){I=I+1|0;K=K+-1|0;a[J>>0]=a[I>>0]|0;a[J+8>>0]=a[I>>0]|0;a[J+16>>0]=a[I>>0]|0;a[J+24>>0]=a[I>>0]|0;a[J+32>>0]=a[I>>0]|0;a[J+40>>0]=a[I>>0]|0;a[J+48>>0]=a[I>>0]|0;a[J+56>>0]=a[I>>0]|0;if(!K)break;else J=J+1|0}}else{if(!b){t=1;u=29;break}f=d[q+8>>0]|0;E=d[e+7>>0]|0;F=d[q>>0]|0;C=(((d[q+5>>0]|0)-(d[q+3>>0]|0)+((d[q+6>>0]|0)-(d[q+2>>0]|0)<<1)+(((d[q+7>>0]|0)-(d[q+1>>0]|0)|0)*3|0)+(f-F<<2)|0)*17|0)+16>>5;D=(((d[e+4>>0]|0)-(d[e+2>>0]|0)+(E-F<<2)+((d[e+5>>0]|0)-(d[e+1>>0]|0)<<1)+(((d[e+6>>0]|0)-(d[e>>0]|0)|0)*3|0)|0)*17|0)+16>>5;F=Z(C,-3)|0;A=(E+f<<4)+16+(Z(D,-3)|0)|0;f=s;E=8;while(1){E=E+-1|0;B=A+F|0;a[f>>0]=a[(B>>5)+3984>>0]|0;L=B+C|0;a[f+1>>0]=a[(L>>5)+3984>>0]|0;B=L+C|0;a[f+2>>0]=a[(B>>5)+3984>>0]|0;L=B+C|0;a[f+3>>0]=a[(L>>5)+3984>>0]|0;B=L+C|0;a[f+4>>0]=a[(B>>5)+3984>>0]|0;L=B+C|0;a[f+5>>0]=a[(L>>5)+3984>>0]|0;B=L+C|0;a[f+6>>0]=a[(B>>5)+3984>>0]|0;a[f+7>>0]=a[(B+C>>5)+3984>>0]|0;if(!E)break;else{A=A+D|0;f=f+8|0}}}Sb(s,h,g);f=g|1;Sb(s,h+64|0,f);Sb(s,h+128|0,f+1|0);Sb(s,h+192|0,g|3);n=n+1|0;if(n>>>0>=2){t=0;u=29;break}else{q=q+9|0;g=g+4|0;s=s+64|0;e=e+8|0;h=h+256|0}}if((u|0)==29){i=l;return t|0}return 0}function Sb(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;g=i;h=c[e>>2]|0;if((h|0)==16777215){i=g;return}j=f>>>0<16;k=j?16:8;l=j?f:f&3;f=(Z(c[3408+(l<<2)>>2]|0,k)|0)+(c[3344+(l<<2)>>2]|0)|0;l=b+f|0;j=c[e+4>>2]|0;m=b+(f+1)|0;n=d[m>>0]|0;a[l>>0]=a[3472+(h+512+(d[l>>0]|0))>>0]|0;l=c[e+8>>2]|0;h=b+(f+2)|0;o=d[h>>0]|0;a[m>>0]=a[3472+(j+512+n)>>0]|0;n=b+(f+3)|0;j=a[3472+((c[e+12>>2]|0)+512+(d[n>>0]|0))>>0]|0;a[h>>0]=a[3472+(l+512+o)>>0]|0;a[n>>0]=j;j=f+k|0;f=b+j|0;n=c[e+20>>2]|0;o=b+(j+1)|0;l=d[o>>0]|0;a[f>>0]=a[3472+((c[e+16>>2]|0)+512+(d[f>>0]|0))>>0]|0;f=c[e+24>>2]|0;h=b+(j+2)|0;m=d[h>>0]|0;a[o>>0]=a[3472+(n+512+l)>>0]|0;l=b+(j+3)|0;n=a[3472+((c[e+28>>2]|0)+512+(d[l>>0]|0))>>0]|0;a[h>>0]=a[3472+(f+512+m)>>0]|0;a[l>>0]=n;n=j+k|0;j=b+n|0;l=c[e+36>>2]|0;m=b+(n+1)|0;f=d[m>>0]|0;a[j>>0]=a[3472+((c[e+32>>2]|0)+512+(d[j>>0]|0))>>0]|0;j=c[e+40>>2]|0;h=b+(n+2)|0;o=d[h>>0]|0;a[m>>0]=a[3472+(l+512+f)>>0]|0;f=b+(n+3)|0;l=a[3472+((c[e+44>>2]|0)+512+(d[f>>0]|0))>>0]|0;a[h>>0]=a[3472+(j+512+o)>>0]|0;a[f>>0]=l;l=n+k|0;k=b+l|0;n=c[e+52>>2]|0;f=b+(l+1)|0;o=d[f>>0]|0;a[k>>0]=a[3472+((c[e+48>>2]|0)+512+(d[k>>0]|0))>>0]|0;k=c[e+56>>2]|0;j=b+(l+2)|0;h=d[j>>0]|0;a[f>>0]=a[3472+(n+512+o)>>0]|0;o=b+(l+3)|0;l=a[3472+((c[e+60>>2]|0)+512+(d[o>>0]|0))>>0]|0;a[j>>0]=a[3472+(k+512+h)>>0]|0;a[o>>0]=l;i=g;return}function Tb(a,f,g,h,j,k){a=a|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0;l=i;i=i+80|0;m=l+72|0;n=l+64|0;o=l+60|0;p=l+68|0;q=l+24|0;r=l;s=c[j+4>>2]|0;t=(h>>>0)/(s>>>0)|0;u=t<<4;v=h-(Z(t,s)|0)<<4;c[r+4>>2]=s;c[r+8>>2]=c[j+8>>2];s=c[a>>2]|0;do if((s|0)==3){t=b[f+160>>1]|0;w=b[f+162>>1]|0;x=c[f+144>>2]|0;y=a+4|0;z=c[y>>2]|0;A=c[a+200>>2]|0;c[q>>2]=0;B=q+4|0;c[B>>2]=-1;C=q+8|0;b[q+10>>1]=0;b[C>>1]=0;if(((A|0)!=0?(c[A+4>>2]|0)==(z|0):0)?(D=c[A>>2]|0,c[q>>2]=1,D>>>0<6):0){D=A+152|0;E=e[D>>1]|e[D+2>>1]<<16;D=c[A+104>>2]|0;c[B>>2]=D;c[C>>2]=E;F=D}else F=-1;if((F|0)==(x|0)){D=c[C>>2]|0;c[n>>2]=D;G=D}else{D=c[a+204>>2]|0;E=q+12|0;c[E>>2]=0;A=q+16|0;c[A>>2]=-1;H=q+20|0;b[q+22>>1]=0;b[H>>1]=0;I=(D|0)==0;if((!I?(c[D+4>>2]|0)==(z|0):0)?(J=c[D>>2]|0,c[E>>2]=1,J>>>0<6):0){J=D+172|0;E=e[J>>1]|e[J+2>>1]<<16;c[A>>2]=c[D+108>>2];c[H>>2]=E}E=q+24|0;c[E>>2]=0;H=q+28|0;c[H>>2]=-1;A=q+32|0;J=q+34|0;b[J>>1]=0;b[A>>1]=0;if(!I?(c[D+4>>2]|0)==(z|0):0){I=c[D>>2]|0;c[E>>2]=1;if(I>>>0<6){I=D+188|0;K=e[I>>1]|e[I+2>>1]<<16;c[H>>2]=c[D+112>>2];c[A>>2]=K}}else L=79;if((((L|0)==79?(K=c[a+212>>2]|0,c[E>>2]=0,c[H>>2]=-1,b[J>>1]=0,b[A>>1]=0,(K|0)!=0):0)?(c[K+4>>2]|0)==(z|0):0)?(z=c[K>>2]|0,c[E>>2]=1,z>>>0<6):0){z=K+192|0;E=e[z>>1]|e[z+2>>1]<<16;c[H>>2]=c[K+112>>2];c[A>>2]=E}Ub(n,q,x);G=c[n>>2]|0}E=(G&65535)+(t&65535)|0;t=(G>>>16)+(w&65535)|0;if(((E<<16>>16)+8192|0)>>>0>16383){M=1;i=l;return M|0}if(((t<<16>>16)+2048|0)>>>0>4095){M=1;i=l;return M|0}w=kc(g,x)|0;if(!w){M=1;i=l;return M|0}A=a+132|0;K=a+136|0;H=a+140|0;z=a+144|0;J=a+164|0;D=a+168|0;I=a+172|0;N=a+176|0;b[a+176>>1]=E;b[a+178>>1]=t;t=e[N>>1]|e[N+2>>1]<<16;b[I>>1]=t;b[I+2>>1]=t>>>16;b[D>>1]=t;b[D+2>>1]=t>>>16;b[J>>1]=t;b[J+2>>1]=t>>>16;b[z>>1]=t;b[z+2>>1]=t>>>16;b[H>>1]=t;b[H+2>>1]=t>>>16;b[K>>1]=t;b[K+2>>1]=t>>>16;b[A>>1]=t;b[A+2>>1]=t>>>16;c[a+100>>2]=x;c[a+108>>2]=x;A=a+116|0;c[A>>2]=w;c[a+124>>2]=w;w=b[f+164>>1]|0;K=b[f+166>>1]|0;H=c[f+148>>2]|0;z=c[y>>2]|0;y=c[a+208>>2]|0;J=q+24|0;c[J>>2]=0;D=q+28|0;c[D>>2]=-1;I=q+32|0;N=q+34|0;b[N>>1]=0;b[I>>1]=0;if((y|0)!=0?(c[y+4>>2]|0)==(z|0):0){E=c[y>>2]|0;c[J>>2]=1;if(E>>>0<6){E=y+172|0;O=e[E>>1]|e[E+2>>1]<<16;E=c[y+108>>2]|0;c[D>>2]=E;c[I>>2]=O;P=E}else P=-1}else{E=c[a+204>>2]|0;c[J>>2]=0;c[D>>2]=-1;b[N>>1]=0;b[I>>1]=0;if(((E|0)!=0?(c[E+4>>2]|0)==(z|0):0)?(N=c[E>>2]|0,c[J>>2]=1,N>>>0<6):0){N=E+176|0;J=e[N>>1]|e[N+2>>1]<<16;N=c[E+108>>2]|0;c[D>>2]=N;c[I>>2]=J;P=N}else P=-1}if((P|0)==(H|0)){N=c[I>>2]|0;c[n>>2]=N;Q=N}else{c[q>>2]=1;c[B>>2]=x;c[C>>2]=t;t=c[a+204>>2]|0;C=q+12|0;c[C>>2]=0;x=q+16|0;c[x>>2]=-1;B=q+20|0;b[q+22>>1]=0;b[B>>1]=0;if(((t|0)!=0?(c[t+4>>2]|0)==(z|0):0)?(z=c[t>>2]|0,c[C>>2]=1,z>>>0<6):0){z=t+188|0;C=e[z>>1]|e[z+2>>1]<<16;c[x>>2]=c[t+112>>2];c[B>>2]=C}Ub(n,q,H);Q=c[n>>2]|0}C=(Q&65535)+(w&65535)|0;w=(Q>>>16)+(K&65535)|0;if(((C<<16>>16)+8192|0)>>>0>16383){M=1;i=l;return M|0}if(((w<<16>>16)+2048|0)>>>0>4095){M=1;i=l;return M|0}K=kc(g,H)|0;if(!K){M=1;i=l;return M|0}else{B=a+148|0;t=a+152|0;x=a+156|0;z=a+160|0;N=a+180|0;I=a+184|0;J=a+188|0;D=a+192|0;b[a+192>>1]=C;b[a+194>>1]=w;w=e[D>>1]|e[D+2>>1]<<16;b[J>>1]=w;b[J+2>>1]=w>>>16;b[I>>1]=w;b[I+2>>1]=w>>>16;b[N>>1]=w;b[N+2>>1]=w>>>16;b[z>>1]=w;b[z+2>>1]=w>>>16;b[x>>1]=w;b[x+2>>1]=w>>>16;b[t>>1]=w;b[t+2>>1]=w>>>16;b[B>>1]=w;b[B+2>>1]=w>>>16;c[a+104>>2]=H;c[a+112>>2]=H;H=a+120|0;c[H>>2]=K;c[a+128>>2]=K;c[r>>2]=c[A>>2];fc(k,a+132|0,r,v,u,0,0,8,16);c[r>>2]=c[H>>2];fc(k,B,r,v,u,8,0,8,16);break}}else if((s|0)==2){B=b[f+160>>1]|0;H=b[f+162>>1]|0;A=c[f+144>>2]|0;K=a+4|0;w=c[K>>2]|0;t=c[a+204>>2]|0;x=q+12|0;c[x>>2]=0;z=q+16|0;c[z>>2]=-1;N=q+20|0;b[q+22>>1]=0;b[N>>1]=0;if(((t|0)!=0?(c[t+4>>2]|0)==(w|0):0)?(I=c[t>>2]|0,c[x>>2]=1,I>>>0<6):0){I=t+172|0;J=e[I>>1]|e[I+2>>1]<<16;I=c[t+108>>2]|0;c[z>>2]=I;c[N>>2]=J;R=I}else R=-1;if((R|0)==(A|0)){I=c[N>>2]|0;c[o>>2]=I;S=I}else{I=c[a+200>>2]|0;c[q>>2]=0;J=q+4|0;c[J>>2]=-1;t=q+8|0;b[q+10>>1]=0;b[t>>1]=0;if(((I|0)!=0?(c[I+4>>2]|0)==(w|0):0)?(D=c[I>>2]|0,c[q>>2]=1,D>>>0<6):0){D=I+152|0;C=e[D>>1]|e[D+2>>1]<<16;c[J>>2]=c[I+104>>2];c[t>>2]=C}C=c[a+208>>2]|0;t=q+24|0;c[t>>2]=0;I=q+28|0;c[I>>2]=-1;J=q+32|0;D=q+34|0;b[D>>1]=0;b[J>>1]=0;if((C|0)!=0?(c[C+4>>2]|0)==(w|0):0){E=c[C>>2]|0;c[t>>2]=1;if(E>>>0<6){E=C+172|0;O=e[E>>1]|e[E+2>>1]<<16;c[I>>2]=c[C+108>>2];c[J>>2]=O}}else L=42;if((((L|0)==42?(O=c[a+212>>2]|0,c[t>>2]=0,c[I>>2]=-1,b[D>>1]=0,b[J>>1]=0,(O|0)!=0):0)?(c[O+4>>2]|0)==(w|0):0)?(w=c[O>>2]|0,c[t>>2]=1,w>>>0<6):0){w=O+192|0;t=e[w>>1]|e[w+2>>1]<<16;c[I>>2]=c[O+112>>2];c[J>>2]=t}Ub(o,q,A);S=c[o>>2]|0}t=(S&65535)+(B&65535)|0;B=(S>>>16)+(H&65535)|0;if(((t<<16>>16)+8192|0)>>>0>16383){M=1;i=l;return M|0}if(((B<<16>>16)+2048|0)>>>0>4095){M=1;i=l;return M|0}H=kc(g,A)|0;if(!H){M=1;i=l;return M|0}J=a+132|0;O=a+136|0;I=a+140|0;w=a+144|0;D=a+148|0;C=a+152|0;E=a+156|0;y=a+160|0;b[a+160>>1]=t;b[a+162>>1]=B;B=e[y>>1]|e[y+2>>1]<<16;b[E>>1]=B;b[E+2>>1]=B>>>16;b[C>>1]=B;b[C+2>>1]=B>>>16;b[D>>1]=B;b[D+2>>1]=B>>>16;b[w>>1]=B;b[w+2>>1]=B>>>16;b[I>>1]=B;b[I+2>>1]=B>>>16;b[O>>1]=B;b[O+2>>1]=B>>>16;b[J>>1]=B;b[J+2>>1]=B>>>16;c[a+100>>2]=A;c[a+104>>2]=A;J=a+116|0;c[J>>2]=H;c[a+120>>2]=H;H=b[f+164>>1]|0;O=b[f+166>>1]|0;I=c[f+148>>2]|0;w=c[K>>2]|0;K=c[a+200>>2]|0;c[q>>2]=0;D=q+4|0;c[D>>2]=-1;C=q+8|0;b[q+10>>1]=0;b[C>>1]=0;E=(K|0)==0;if((!E?(c[K+4>>2]|0)==(w|0):0)?(y=c[K>>2]|0,c[q>>2]=1,y>>>0<6):0){y=K+184|0;t=e[y>>1]|e[y+2>>1]<<16;y=c[K+112>>2]|0;c[D>>2]=y;c[C>>2]=t;T=y}else T=-1;if((T|0)==(I|0)){y=c[C>>2]|0;c[o>>2]=y;U=y}else{c[x>>2]=1;c[z>>2]=A;c[N>>2]=B;B=q+24|0;c[B>>2]=0;N=q+28|0;c[N>>2]=-1;A=q+32|0;b[q+34>>1]=0;b[A>>1]=0;if((!E?(c[K+4>>2]|0)==(w|0):0)?(w=c[K>>2]|0,c[B>>2]=1,w>>>0<6):0){w=K+160|0;B=e[w>>1]|e[w+2>>1]<<16;c[N>>2]=c[K+104>>2];c[A>>2]=B}Ub(o,q,I);U=c[o>>2]|0}B=(U&65535)+(H&65535)|0;H=(U>>>16)+(O&65535)|0;if(((B<<16>>16)+8192|0)>>>0>16383){M=1;i=l;return M|0}if(((H<<16>>16)+2048|0)>>>0>4095){M=1;i=l;return M|0}O=kc(g,I)|0;if(!O){M=1;i=l;return M|0}else{A=a+164|0;K=a+168|0;N=a+172|0;w=a+176|0;E=a+180|0;z=a+184|0;x=a+188|0;y=a+192|0;b[a+192>>1]=B;b[a+194>>1]=H;H=e[y>>1]|e[y+2>>1]<<16;b[x>>1]=H;b[x+2>>1]=H>>>16;b[z>>1]=H;b[z+2>>1]=H>>>16;b[E>>1]=H;b[E+2>>1]=H>>>16;b[w>>1]=H;b[w+2>>1]=H>>>16;b[N>>1]=H;b[N+2>>1]=H>>>16;b[K>>1]=H;b[K+2>>1]=H>>>16;b[A>>1]=H;b[A+2>>1]=H>>>16;c[a+108>>2]=I;c[a+112>>2]=I;I=a+124|0;c[I>>2]=O;c[a+128>>2]=O;c[r>>2]=c[J>>2];fc(k,a+132|0,r,v,u,0,0,16,8);c[r>>2]=c[I>>2];fc(k,A,r,v,u,0,8,16,8);break}}else if((s|0)==1|(s|0)==0){A=c[f+144>>2]|0;I=c[a+4>>2]|0;J=c[a+200>>2]|0;c[q>>2]=0;O=q+4|0;c[O>>2]=-1;H=q+8|0;b[q+10>>1]=0;b[H>>1]=0;if((J|0)!=0?(c[J+4>>2]|0)==(I|0):0){K=c[J>>2]|0;c[q>>2]=1;if(K>>>0<6){K=J+152|0;N=e[K>>1]|e[K+2>>1]<<16;K=c[J+104>>2]|0;c[O>>2]=K;c[H>>2]=N;V=1;W=K}else{V=1;W=-1}}else{V=0;W=-1}K=c[a+204>>2]|0;N=q+12|0;c[N>>2]=0;O=q+16|0;c[O>>2]=-1;J=q+20|0;b[q+22>>1]=0;b[J>>1]=0;if((K|0)!=0?(c[K+4>>2]|0)==(I|0):0){w=c[K>>2]|0;c[N>>2]=1;if(w>>>0<6){w=K+172|0;N=e[w>>1]|e[w+2>>1]<<16;w=c[K+108>>2]|0;c[O>>2]=w;c[J>>2]=N;X=1;Y=w}else{X=1;Y=-1}}else{X=0;Y=-1}do if(!s)if(!((V|0)==0|(X|0)==0)){if((W|0)==0?(c[H>>2]|0)==0:0){_=0;$=0;break}if((Y|0)==0?(c[J>>2]|0)==0:0){_=0;$=0}else L=16}else{_=0;$=0}else L=16;while(0);if((L|0)==16){J=b[f+160>>1]|0;H=b[f+162>>1]|0;w=c[a+208>>2]|0;N=q+24|0;c[N>>2]=0;O=q+28|0;c[O>>2]=-1;K=q+32|0;E=q+34|0;b[E>>1]=0;b[K>>1]=0;if((w|0)!=0?(c[w+4>>2]|0)==(I|0):0){z=c[w>>2]|0;c[N>>2]=1;if(z>>>0<6){z=w+172|0;x=e[z>>1]|e[z+2>>1]<<16;c[O>>2]=c[w+108>>2];c[K>>2]=x}}else L=20;if((((L|0)==20?(x=c[a+212>>2]|0,c[N>>2]=0,c[O>>2]=-1,b[E>>1]=0,b[K>>1]=0,(x|0)!=0):0)?(c[x+4>>2]|0)==(I|0):0)?(E=c[x>>2]|0,c[N>>2]=1,E>>>0<6):0){E=x+192|0;N=e[E>>1]|e[E+2>>1]<<16;c[O>>2]=c[x+112>>2];c[K>>2]=N}Ub(p,q,A);N=(e[p>>1]|0)+(J&65535)|0;J=(e[p+2>>1]|0)+(H&65535)|0;if(((N<<16>>16)+8192|0)>>>0>16383){M=1;i=l;return M|0}if(((J<<16>>16)+2048|0)>>>0>4095){M=1;i=l;return M|0}else{_=N&65535;$=J&65535}}J=kc(g,A)|0;if(!J){M=1;i=l;return M|0}else{N=a+132|0;H=a+136|0;K=a+140|0;x=a+144|0;O=a+148|0;E=a+152|0;w=a+156|0;z=a+160|0;y=a+164|0;B=a+168|0;C=a+172|0;t=a+176|0;D=a+180|0;aa=a+184|0;ba=a+188|0;ca=a+192|0;b[a+192>>1]=_;b[a+194>>1]=$;da=e[ca>>1]|e[ca+2>>1]<<16;b[ba>>1]=da;b[ba+2>>1]=da>>>16;b[aa>>1]=da;b[aa+2>>1]=da>>>16;b[D>>1]=da;b[D+2>>1]=da>>>16;b[t>>1]=da;b[t+2>>1]=da>>>16;b[C>>1]=da;b[C+2>>1]=da>>>16;b[B>>1]=da;b[B+2>>1]=da>>>16;b[y>>1]=da;b[y+2>>1]=da>>>16;b[z>>1]=da;b[z+2>>1]=da>>>16;b[w>>1]=da;b[w+2>>1]=da>>>16;b[E>>1]=da;b[E+2>>1]=da>>>16;b[O>>1]=da;b[O+2>>1]=da>>>16;b[x>>1]=da;b[x+2>>1]=da>>>16;b[K>>1]=da;b[K+2>>1]=da>>>16;b[H>>1]=da;b[H+2>>1]=da>>>16;b[N>>1]=da;b[N+2>>1]=da>>>16;c[a+100>>2]=A;c[a+104>>2]=A;c[a+108>>2]=A;c[a+112>>2]=A;c[a+116>>2]=J;c[a+120>>2]=J;c[a+124>>2]=J;c[a+128>>2]=J;c[r>>2]=J;fc(k,a+132|0,r,v,u,0,0,16,16);break}}else{J=a+4|0;da=q+4|0;N=q+8|0;H=q+10|0;K=q+12|0;x=q+16|0;O=q+20|0;E=q+22|0;w=q+24|0;z=q+28|0;y=q+32|0;B=q+34|0;C=m+2|0;t=0;a:while(1){D=f+(t<<2)+176|0;aa=eb(c[D>>2]|0)|0;ba=f+(t<<2)+192|0;c[a+(t<<2)+100>>2]=c[ba>>2];ca=kc(g,c[ba>>2]|0)|0;c[a+(t<<2)+116>>2]=ca;if(!ca){M=1;L=146;break}if(aa){ca=t<<2;ea=a+(ca<<2)+132|0;fa=a+(ca<<2)+134|0;ga=ca|1;ha=a+(ga<<2)+132|0;ia=a+(ga<<2)+134|0;ga=ca|2;ja=a+(ga<<2)+132|0;ka=a+(ga<<2)+134|0;ga=ca|3;la=a+(ga<<2)+132|0;ma=a+(ga<<2)+134|0;ga=0;do{na=b[f+(t<<4)+(ga<<2)+208>>1]|0;oa=b[f+(t<<4)+(ga<<2)+210>>1]|0;pa=hb(c[D>>2]|0)|0;qa=c[ba>>2]|0;ra=ub(a,c[6288+(t<<7)+(pa<<5)+(ga<<3)>>2]|0)|0;sa=c[J>>2]|0;ta=d[6288+(t<<7)+(pa<<5)+(ga<<3)+4>>0]|0;c[q>>2]=0;c[da>>2]=-1;b[H>>1]=0;b[N>>1]=0;if(((ra|0)!=0?(c[ra+4>>2]|0)==(sa|0):0)?(sa=c[ra>>2]|0,c[q>>2]=1,sa>>>0<6):0){sa=ra+(ta<<2)+132|0;ua=e[sa>>1]|e[sa+2>>1]<<16;c[da>>2]=c[ra+(ta>>>2<<2)+100>>2];c[N>>2]=ua}ua=ub(a,c[5776+(t<<7)+(pa<<5)+(ga<<3)>>2]|0)|0;ta=c[J>>2]|0;ra=d[5776+(t<<7)+(pa<<5)+(ga<<3)+4>>0]|0;c[K>>2]=0;c[x>>2]=-1;b[E>>1]=0;b[O>>1]=0;if(((ua|0)!=0?(c[ua+4>>2]|0)==(ta|0):0)?(ta=c[ua>>2]|0,c[K>>2]=1,ta>>>0<6):0){ta=ua+(ra<<2)+132|0;sa=e[ta>>1]|e[ta+2>>1]<<16;c[x>>2]=c[ua+(ra>>>2<<2)+100>>2];c[O>>2]=sa}sa=ub(a,c[5264+(t<<7)+(pa<<5)+(ga<<3)>>2]|0)|0;ra=c[J>>2]|0;ua=d[5264+(t<<7)+(pa<<5)+(ga<<3)+4>>0]|0;c[w>>2]=0;c[z>>2]=-1;b[B>>1]=0;b[y>>1]=0;if((sa|0)!=0?(c[sa+4>>2]|0)==(ra|0):0){ra=c[sa>>2]|0;c[w>>2]=1;if(ra>>>0<6){ra=sa+(ua<<2)+132|0;ta=e[ra>>1]|e[ra+2>>1]<<16;c[z>>2]=c[sa+(ua>>>2<<2)+100>>2];c[y>>2]=ta}}else L=122;if((((L|0)==122?(L=0,ta=ub(a,c[4752+(t<<7)+(pa<<5)+(ga<<3)>>2]|0)|0,ua=c[J>>2]|0,sa=d[4752+(t<<7)+(pa<<5)+(ga<<3)+4>>0]|0,c[w>>2]=0,c[z>>2]=-1,b[B>>1]=0,b[y>>1]=0,(ta|0)!=0):0)?(c[ta+4>>2]|0)==(ua|0):0)?(ua=c[ta>>2]|0,c[w>>2]=1,ua>>>0<6):0){ua=ta+(sa<<2)+132|0;ra=e[ua>>1]|e[ua+2>>1]<<16;c[z>>2]=c[ta+(sa>>>2<<2)+100>>2];c[y>>2]=ra}Ub(m,q,qa);qa=(e[m>>1]|0)+(na&65535)|0;na=qa&65535;ra=(e[C>>1]|0)+(oa&65535)|0;oa=ra&65535;if(((qa<<16>>16)+8192|0)>>>0>16383){M=1;L=146;break a}if(((ra<<16>>16)+2048|0)>>>0>4095){M=1;L=146;break a}if((pa|0)==1){ra=(ga<<1)+ca|0;b[a+(ra<<2)+132>>1]=na;b[a+(ra<<2)+134>>1]=oa;qa=ra|1;b[a+(qa<<2)+132>>1]=na;b[a+(qa<<2)+134>>1]=oa}else if((pa|0)==2){qa=ga+ca|0;b[a+(qa<<2)+132>>1]=na;b[a+(qa<<2)+134>>1]=oa;ra=qa+2|0;b[a+(ra<<2)+132>>1]=na;b[a+(ra<<2)+134>>1]=oa}else if((pa|0)==3){ra=ga+ca|0;b[a+(ra<<2)+132>>1]=na;b[a+(ra<<2)+134>>1]=oa}else if(!pa){b[ea>>1]=na;b[fa>>1]=oa;b[ha>>1]=na;b[ia>>1]=oa;b[ja>>1]=na;b[ka>>1]=oa;b[la>>1]=na;b[ma>>1]=oa}ga=ga+1|0}while(ga>>>0<aa>>>0)}t=t+1|0;if(t>>>0>=4){L=135;break}}if((L|0)==135){t=0;do{c[r>>2]=c[a+(t<<2)+116>>2];C=hb(c[f+(t<<2)+176>>2]|0)|0;y=t<<3&8;z=t>>>0<2?0:8;if(!C)fc(k,a+(t<<2<<2)+132|0,r,v,u,y,z,8,8);else if((C|0)==1){w=t<<2;fc(k,a+(w<<2)+132|0,r,v,u,y,z,8,4);fc(k,a+((w|2)<<2)+132|0,r,v,u,y,z|4,8,4)}else if((C|0)==2){C=t<<2;fc(k,a+(C<<2)+132|0,r,v,u,y,z,4,8);fc(k,a+((C|1)<<2)+132|0,r,v,u,y|4,z,4,8)}else{C=t<<2;fc(k,a+(C<<2)+132|0,r,v,u,y,z,4,4);w=y|4;fc(k,a+((C|1)<<2)+132|0,r,v,u,w,z,4,4);B=z|4;fc(k,a+((C|2)<<2)+132|0,r,v,u,y,B,4,4);fc(k,a+((C|3)<<2)+132|0,r,v,u,w,B,4,4)}t=t+1|0}while((t|0)!=4)}else if((L|0)==146){i=l;return M|0}}while(0);if((c[a+196>>2]|0)>>>0>1){M=0;i=l;return M|0}if(!(c[a>>2]|0)){vc(j,k);M=0;i=l;return M|0}else{wc(j,h,k,f+328|0);M=0;i=l;return M|0}return 0}function Ub(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;g=i;if(((c[d+12>>2]|0)==0?(c[d+24>>2]|0)==0:0)?(c[d>>2]|0)!=0:0){h=d+8|0;j=e[h>>1]|e[h+2>>1]<<16;b[a>>1]=j;b[a+2>>1]=j>>>16;i=g;return}j=(c[d+4>>2]|0)==(f|0);h=(c[d+16>>2]|0)==(f|0);if(((h&1)+(j&1)+((c[d+28>>2]|0)==(f|0)&1)|0)==1){if(j){j=d+8|0;f=e[j>>1]|e[j+2>>1]<<16;b[a>>1]=f;b[a+2>>1]=f>>>16;i=g;return}if(h){h=d+20|0;f=e[h>>1]|e[h+2>>1]<<16;b[a>>1]=f;b[a+2>>1]=f>>>16;i=g;return}else{f=d+32|0;h=e[f>>1]|e[f+2>>1]<<16;b[a>>1]=h;b[a+2>>1]=h>>>16;i=g;return}}h=b[d+8>>1]|0;f=h<<16>>16;j=b[d+20>>1]|0;k=j<<16>>16;l=b[d+32>>1]|0;if(j<<16>>16>h<<16>>16){m=k;n=f}else{m=f;n=(k|0)<(f|0)?k:f}if((m|0)<(l|0))o=m;else o=(n|0)>(l|0)?n:l;b[a>>1]=o;o=b[d+10>>1]|0;l=o<<16>>16;n=b[d+22>>1]|0;m=n<<16>>16;f=b[d+34>>1]|0;if(n<<16>>16>o<<16>>16){p=m;q=l}else{p=l;q=(m|0)<(l|0)?m:l}if((p|0)<(f|0))r=p;else r=(q|0)>(f|0)?q:f;b[a+2>>1]=r;i=g;return}function Vb(b,c,e,f,g,h,j,k,l){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;m=i;i=i+144|0;n=m;if((e|0)>=0?!((e+1+k|0)>>>0>g>>>0|(f|0)<0|(l+f|0)>>>0>h>>>0):0){o=h;p=b;q=g;r=e;s=f}else{t=k+1|0;Wb(b,n,e,f,g,h,t,l,t);Wb(b+(Z(h,g)|0)|0,n+(Z(t,l)|0)|0,e,f,g,h,t,l,t);o=l;p=n;q=t;r=0;s=0}t=8-j|0;n=l>>>1;l=(n|0)==0;h=k>>>1;g=(h|0)==0;f=16-k|0;e=(q<<1)-k|0;k=q+1|0;b=q+2|0;u=h<<1;if(l){i=m;return}v=c;w=p+((Z(s,q)|0)+r)|0;x=n;while(1){if(g){y=v;z=w}else{A=v+u|0;B=v;C=w;D=h;while(1){E=d[C>>0]|0;F=d[C+k>>0]|0;G=C;C=C+2|0;H=d[G+1>>0]|0;a[B+8>>0]=(((Z(F,j)|0)+(Z(d[G+q>>0]|0,t)|0)<<3)+32|0)>>>6;a[B>>0]=(((Z(H,j)|0)+(Z(E,t)|0)<<3)+32|0)>>>6;E=d[C>>0]|0;a[B+9>>0]=(((Z(d[G+b>>0]|0,j)|0)+(Z(F,t)|0)<<3)+32|0)>>>6;a[B+1>>0]=(((Z(E,j)|0)+(Z(H,t)|0)<<3)+32|0)>>>6;D=D+-1|0;if(!D)break;else B=B+2|0}y=A;z=w+u|0}x=x+-1|0;if(!x)break;else{v=y+f|0;w=z+e|0}}if(l){i=m;return}l=c+64|0;c=p+((Z(o+s|0,q)|0)+r)|0;r=n;while(1){if(g){I=l;J=c}else{n=l+u|0;s=l;o=c;p=h;while(1){z=d[o>>0]|0;w=d[o+k>>0]|0;y=o;o=o+2|0;v=d[y+1>>0]|0;a[s+8>>0]=(((Z(w,j)|0)+(Z(d[y+q>>0]|0,t)|0)<<3)+32|0)>>>6;a[s>>0]=(((Z(v,j)|0)+(Z(z,t)|0)<<3)+32|0)>>>6;z=d[o>>0]|0;a[s+9>>0]=(((Z(d[y+b>>0]|0,j)|0)+(Z(w,t)|0)<<3)+32|0)>>>6;a[s+1>>0]=(((Z(z,j)|0)+(Z(v,t)|0)<<3)+32|0)>>>6;p=p+-1|0;if(!p)break;else s=s+2|0}I=n;J=c+u|0}r=r+-1|0;if(!r)break;else{l=I+f|0;c=J+e|0}}i=m;return}function Wb(a,b,c,d,e,f,g,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;k=i;l=g+c|0;m=h+d|0;n=(c|0)<0|(l|0)>(e|0)?2:1;o=(m|0)<0?0-h|0:d;d=(l|0)<0?0-g|0:c;c=(o|0)>(f|0)?f:o;o=(d|0)>(e|0)?e:d;d=o+g|0;l=c+h|0;if((o|0)>0)p=a+o|0;else p=a;if((c|0)>0)q=p+(Z(c,e)|0)|0;else q=p;p=(o|0)<0?0-o|0:0;o=(d|0)>(e|0)?d-e|0:0;d=g-p-o|0;g=0-c|0;a=(c|0)<0?g:0;c=l-f|0;r=(l|0)>(f|0)?c:0;l=h-a|0;s=l-r|0;if(!a)t=b;else{a=h+-1-((m|0)>0?m:0)|0;u=~f;v=(a|0)>(u|0)?a:u;u=~v;a=Z(v+((u|0)>0?u:0)+1|0,j)|0;u=b;v=g;while(1){xa[n&3](q,u,p,d,o);v=v+-1|0;if(!v)break;else u=u+j|0}t=b+a|0}if((l|0)==(r|0)){w=t;x=q}else{l=h+-1|0;a=l-((m|0)>0?m:0)|0;m=~f;b=(a|0)>(m|0)?a:m;m=l-b|0;l=~b;a=h+f+-1-((m|0)<(f|0)?f:m)-b-((l|0)>0?l:0)|0;l=Z(a,j)|0;b=Z(a,e)|0;a=t;m=q;f=s;while(1){xa[n&3](m,a,p,d,o);f=f+-1|0;if(!f)break;else{a=a+j|0;m=m+e|0}}w=t+l|0;x=q+b|0}b=x+(0-e)|0;if(!r){i=k;return}else{y=c;z=w}while(1){xa[n&3](b,z,p,d,o);y=y+-1|0;if(!y)break;else z=z+j|0}i=k;return}
function Xb(b,c,e,f,g,h,j,k,l){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;m=i;i=i+144|0;n=m;if(((e|0)>=0?!((k+e|0)>>>0>g>>>0|(f|0)<0):0)?(f+1+l|0)>>>0<=h>>>0:0){o=h;p=b;q=g;r=e;s=f}else{t=l+1|0;Wb(b,n,e,f,g,h,k,t,k);Wb(b+(Z(h,g)|0)|0,n+(Z(t,k)|0)|0,e,f,g,h,k,t,k);o=t;p=n;q=k;r=0;s=0}n=8-j|0;t=l>>>1;l=(t|0)==0;h=k>>>1;g=(h|0)==0;f=16-k|0;e=q<<1;b=e-k|0;k=e|1;u=q+1|0;v=h<<1;if(l){i=m;return}w=c;x=p+((Z(s,q)|0)+r)|0;y=t;while(1){if(g){z=w;A=x}else{B=w+v|0;C=w;D=x;E=h;while(1){F=d[D+q>>0]|0;G=d[D>>0]|0;a[C+8>>0]=(((Z(F,n)|0)+(Z(d[D+e>>0]|0,j)|0)<<3)+32|0)>>>6;a[C>>0]=(((Z(G,n)|0)+(Z(F,j)|0)<<3)+32|0)>>>6;F=d[D+u>>0]|0;G=d[D+1>>0]|0;a[C+9>>0]=(((Z(F,n)|0)+(Z(d[D+k>>0]|0,j)|0)<<3)+32|0)>>>6;a[C+1>>0]=(((Z(G,n)|0)+(Z(F,j)|0)<<3)+32|0)>>>6;E=E+-1|0;if(!E)break;else{C=C+2|0;D=D+2|0}}z=B;A=x+v|0}y=y+-1|0;if(!y)break;else{w=z+f|0;x=A+b|0}}if(l){i=m;return}l=c+64|0;c=p+((Z(o+s|0,q)|0)+r)|0;r=t;while(1){if(g){H=l;I=c}else{t=l+v|0;s=l;o=c;p=h;while(1){A=d[o+q>>0]|0;x=d[o>>0]|0;a[s+8>>0]=(((Z(A,n)|0)+(Z(d[o+e>>0]|0,j)|0)<<3)+32|0)>>>6;a[s>>0]=(((Z(x,n)|0)+(Z(A,j)|0)<<3)+32|0)>>>6;A=d[o+u>>0]|0;x=d[o+1>>0]|0;a[s+9>>0]=(((Z(A,n)|0)+(Z(d[o+k>>0]|0,j)|0)<<3)+32|0)>>>6;a[s+1>>0]=(((Z(x,n)|0)+(Z(A,j)|0)<<3)+32|0)>>>6;p=p+-1|0;if(!p)break;else{s=s+2|0;o=o+2|0}}H=t;I=c+v|0}r=r+-1|0;if(!r)break;else{l=H+f|0;c=I+b|0}}i=m;return}function Yb(b,c,e,f,g,h,j,k,l,m){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;n=i;i=i+176|0;o=n;if(((e|0)>=0?!((e+1+l|0)>>>0>g>>>0|(f|0)<0):0)?(f+1+m|0)>>>0<=h>>>0:0){p=h;q=b;r=g;s=e;t=f}else{u=l+1|0;v=m+1|0;Wb(b,o,e,f,g,h,u,v,u);Wb(b+(Z(h,g)|0)|0,o+(Z(v,u)|0)|0,e,f,g,h,u,v,u);p=v;q=o;r=u;s=0;t=0}u=8-j|0;o=8-k|0;v=m>>>1;m=(v|0)==0;h=r<<1;g=l>>>1;f=(g|0)==0;e=16-l|0;b=h-l|0;l=r+1|0;w=h|1;x=r+2|0;y=h+2|0;z=g<<1;A=0;do{if(!m){B=c+(A<<6)|0;C=q+((Z((Z(A,p)|0)+t|0,r)|0)+s)|0;D=v;while(1){E=d[C+r>>0]|0;if(f){F=B;G=C}else{H=B+z|0;I=B;J=C;K=(Z(E,k)|0)+(Z(d[C>>0]|0,o)|0)|0;L=(Z(d[C+h>>0]|0,k)|0)+(Z(E,o)|0)|0;E=g;while(1){M=d[J+l>>0]|0;N=(Z(M,k)|0)+(Z(d[J+1>>0]|0,o)|0)|0;O=(Z(d[J+w>>0]|0,k)|0)+(Z(M,o)|0)|0;M=((Z(K,u)|0)+32+(Z(N,j)|0)|0)>>>6;a[I+8>>0]=((Z(L,u)|0)+32+(Z(O,j)|0)|0)>>>6;a[I>>0]=M;M=J;J=J+2|0;P=d[M+x>>0]|0;K=(Z(P,k)|0)+(Z(d[J>>0]|0,o)|0)|0;L=(Z(d[M+y>>0]|0,k)|0)+(Z(P,o)|0)|0;P=((Z(N,u)|0)+32+(Z(K,j)|0)|0)>>>6;a[I+9>>0]=((Z(O,u)|0)+32+(Z(L,j)|0)|0)>>>6;a[I+1>>0]=P;E=E+-1|0;if(!E)break;else I=I+2|0}F=H;G=C+z|0}D=D+-1|0;if(!D)break;else{B=F+e|0;C=G+b|0}}}A=A+1|0}while((A|0)!=2);i=n;return}function Zb(b,c,e,f,g,h,j,k){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;l=i;i=i+448|0;m=l;if(((e|0)>=0?!((j+e|0)>>>0>g>>>0|(f|0)<0):0)?(f+5+k|0)>>>0<=h>>>0:0){n=b;o=g;p=e;q=f}else{Wb(b,m,e,f,g,h,j,k+5|0,j);n=m;o=j;p=0;q=0}m=p+o+(Z(q,o)|0)|0;q=k>>>2;if(!q){i=l;return}k=(j|0)==0;p=(o<<2)-j|0;h=64-j|0;g=0-o|0;f=g<<1;e=o<<1;b=q;q=c;c=n+m|0;r=n+(m+(o*5|0))|0;while(1){if(k){s=q;t=c;u=r}else{m=q+j|0;n=j;v=q;w=c;x=r;while(1){y=d[x+f>>0]|0;z=d[x+g>>0]|0;A=d[x+o>>0]|0;B=d[x>>0]|0;C=A+y|0;D=d[w+e>>0]|0;a[v+48>>0]=a[((d[x+e>>0]|0)+16-C-(C<<2)+D+((B+z|0)*20|0)>>5)+3984>>0]|0;C=D+B|0;E=d[w+o>>0]|0;a[v+32>>0]=a[(A+16-C-(C<<2)+E+((z+y|0)*20|0)>>5)+3984>>0]|0;C=E+z|0;A=d[w>>0]|0;a[v+16>>0]=a[(B+16-C-(C<<2)+A+((D+y|0)*20|0)>>5)+3984>>0]|0;C=A+y|0;a[v>>0]=a[(z+16-C-(C<<2)+(d[w+g>>0]|0)+((E+D|0)*20|0)>>5)+3984>>0]|0;n=n+-1|0;if(!n)break;else{v=v+1|0;w=w+1|0;x=x+1|0}}s=m;t=c+j|0;u=r+j|0}b=b+-1|0;if(!b)break;else{q=s+h|0;c=t+p|0;r=u+p|0}}i=l;return}function _b(b,c,e,f,g,h,j,k,l){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;m=i;i=i+448|0;n=m;if(((e|0)>=0?!((j+e|0)>>>0>g>>>0|(f|0)<0):0)?(f+5+k|0)>>>0<=h>>>0:0){o=b;p=g;q=e;r=f}else{Wb(b,n,e,f,g,h,j,k+5|0,j);o=n;p=j;q=0;r=0}n=q+p+(Z(r,p)|0)|0;r=k>>>2;if(!r){i=m;return}k=(j|0)==0;q=(p<<2)-j|0;h=64-j|0;g=0-p|0;f=g<<1;e=p<<1;b=r;r=c;c=o+n|0;s=o+(n+(Z(p,l+2|0)|0))|0;l=o+(n+(p*5|0))|0;while(1){if(k){t=r;u=c;v=s;w=l}else{n=s+j|0;o=r+j|0;x=j;y=r;z=c;A=s;B=l;while(1){C=d[B+f>>0]|0;D=d[B+g>>0]|0;E=d[B+p>>0]|0;F=d[B>>0]|0;G=E+C|0;H=d[z+e>>0]|0;a[y+48>>0]=((d[((d[B+e>>0]|0)+16-G-(G<<2)+H+((F+D|0)*20|0)>>5)+3984>>0]|0)+1+(d[A+e>>0]|0)|0)>>>1;G=H+F|0;I=d[z+p>>0]|0;a[y+32>>0]=((d[(E+16-G-(G<<2)+I+((D+C|0)*20|0)>>5)+3984>>0]|0)+1+(d[A+p>>0]|0)|0)>>>1;G=I+D|0;E=d[z>>0]|0;a[y+16>>0]=((d[(F+16-G-(G<<2)+E+((H+C|0)*20|0)>>5)+3984>>0]|0)+1+(d[A>>0]|0)|0)>>>1;G=E+C|0;a[y>>0]=((d[(D+16-G-(G<<2)+(d[z+g>>0]|0)+((I+H|0)*20|0)>>5)+3984>>0]|0)+1+(d[A+g>>0]|0)|0)>>>1;x=x+-1|0;if(!x)break;else{y=y+1|0;z=z+1|0;A=A+1|0;B=B+1|0}}t=o;u=c+j|0;v=n;w=l+j|0}b=b+-1|0;if(!b)break;else{r=t+h|0;c=u+q|0;s=v+q|0;l=w+q|0}}i=m;return}function $b(b,c,e,f,g,h,j,k){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;l=i;i=i+448|0;m=l;if((e|0)>=0?!((e+5+j|0)>>>0>g>>>0|(f|0)<0|(k+f|0)>>>0>h>>>0):0){n=b;o=g;p=e;q=f}else{r=j+5|0;Wb(b,m,e,f,g,h,r,k,r);n=m;o=r;p=0;q=0}if(!k){i=l;return}r=j>>>2;m=(r|0)==0;h=o-j|0;g=16-j|0;j=r<<2;f=c;c=n+(p+5+(Z(q,o)|0))|0;o=k;while(1){if(m){s=f;t=c}else{k=f+j|0;q=f;p=c;n=d[c+-1>>0]|0;e=d[c+-2>>0]|0;b=d[c+-3>>0]|0;u=d[c+-4>>0]|0;v=d[c+-5>>0]|0;w=r;while(1){x=u+n|0;y=u;u=d[p>>0]|0;a[q>>0]=a[(v+16-x-(x<<2)+u+((b+e|0)*20|0)>>5)+3984>>0]|0;x=u+b|0;z=b;b=d[p+1>>0]|0;a[q+1>>0]=a[(y+16-x-(x<<2)+b+((e+n|0)*20|0)>>5)+3984>>0]|0;x=b+e|0;y=e;e=d[p+2>>0]|0;a[q+2>>0]=a[(z+16-x-(x<<2)+e+((u+n|0)*20|0)>>5)+3984>>0]|0;x=e+n|0;z=d[p+3>>0]|0;a[q+3>>0]=a[(y+16-x-(x<<2)+z+((b+u|0)*20|0)>>5)+3984>>0]|0;w=w+-1|0;if(!w)break;else{x=n;q=q+4|0;p=p+4|0;n=z;v=x}}s=k;t=c+j|0}o=o+-1|0;if(!o)break;else{f=s+g|0;c=t+h|0}}i=l;return}function ac(b,c,e,f,g,h,j,k,l){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;m=i;i=i+448|0;n=m;if((e|0)>=0?!((e+5+j|0)>>>0>g>>>0|(f|0)<0|(k+f|0)>>>0>h>>>0):0){o=b;p=g;q=e;r=f}else{s=j+5|0;Wb(b,n,e,f,g,h,s,k,s);o=n;p=s;q=0;r=0}if(!k){i=m;return}s=j>>>2;n=(s|0)==0;h=p-j|0;g=16-j|0;j=(l|0)!=0;l=s<<2;f=c;c=o+(q+5+(Z(r,p)|0))|0;p=k;while(1){if(n){t=f;u=c}else{k=f+l|0;r=f;q=c;o=d[c+-1>>0]|0;e=d[c+-2>>0]|0;b=d[c+-3>>0]|0;v=d[c+-4>>0]|0;w=d[c+-5>>0]|0;x=s;while(1){y=v+o|0;z=v;v=d[q>>0]|0;a[r>>0]=((j?e:b)+1+(d[(w+16-y-(y<<2)+v+((b+e|0)*20|0)>>5)+3984>>0]|0)|0)>>>1;y=v+b|0;A=b;b=d[q+1>>0]|0;a[r+1>>0]=((j?o:e)+1+(d[(z+16-y-(y<<2)+b+((e+o|0)*20|0)>>5)+3984>>0]|0)|0)>>>1;y=b+e|0;z=e;e=d[q+2>>0]|0;a[r+2>>0]=((j?v:o)+1+(d[(A+16-y-(y<<2)+e+((v+o|0)*20|0)>>5)+3984>>0]|0)|0)>>>1;y=e+o|0;A=d[q+3>>0]|0;a[r+3>>0]=((j?b:v)+1+(d[(z+16-y-(y<<2)+A+((b+v|0)*20|0)>>5)+3984>>0]|0)|0)>>>1;x=x+-1|0;if(!x)break;else{y=o;r=r+4|0;q=q+4|0;o=A;w=y}}t=k;u=c+l|0}p=p+-1|0;if(!p)break;else{f=t+g|0;c=u+h|0}}i=m;return}function bc(b,c,e,f,g,h,j,k,l){b=b|0;c=c|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;m=i;i=i+448|0;n=m;if(((e|0)>=0?!((e+5+j|0)>>>0>g>>>0|(f|0)<0):0)?(f+5+k|0)>>>0<=h>>>0:0){o=b;p=g;q=e;r=f}else{s=j+5|0;Wb(b,n,e,f,g,h,s,k+5|0,s);o=n;p=s;q=0;r=0}s=(Z(r,p)|0)+q|0;q=(l&1|2)+p+s|0;r=o+q|0;if(!k){i=m;return}n=j>>>2;h=(n|0)==0;g=p-j|0;f=16-j|0;e=n<<2;b=c;c=o+((Z(p,l>>>1&1|2)|0)+5+s)|0;s=k;while(1){if(h){t=b;u=c}else{l=b+e|0;v=b;w=c;x=d[c+-1>>0]|0;y=d[c+-2>>0]|0;z=d[c+-3>>0]|0;A=d[c+-4>>0]|0;B=d[c+-5>>0]|0;C=n;while(1){D=A+x|0;E=A;A=d[w>>0]|0;a[v>>0]=a[(B+16-D-(D<<2)+A+((z+y|0)*20|0)>>5)+3984>>0]|0;D=A+z|0;F=z;z=d[w+1>>0]|0;a[v+1>>0]=a[(E+16-D-(D<<2)+z+((y+x|0)*20|0)>>5)+3984>>0]|0;D=z+y|0;E=y;y=d[w+2>>0]|0;a[v+2>>0]=a[(F+16-D-(D<<2)+y+((A+x|0)*20|0)>>5)+3984>>0]|0;D=y+x|0;F=d[w+3>>0]|0;a[v+3>>0]=a[(E+16-D-(D<<2)+F+((z+A|0)*20|0)>>5)+3984>>0]|0;C=C+-1|0;if(!C)break;else{D=x;v=v+4|0;w=w+4|0;x=F;B=D}}t=l;u=c+e|0}s=s+-1|0;if(!s)break;else{b=t+f|0;c=u+g|0}}g=k>>>2;if(!g){i=m;return}u=(j|0)==0;c=(p<<2)-j|0;b=64-j|0;s=0-p|0;e=s<<1;n=p<<1;h=t+(f-(k<<4))|0;k=r;r=o+(q+(p*5|0))|0;q=g;while(1){if(u){G=h;H=k;I=r}else{g=h+j|0;o=h;f=k;t=r;B=j;while(1){x=d[t+e>>0]|0;w=d[t+s>>0]|0;v=d[t+p>>0]|0;C=d[t>>0]|0;A=v+x|0;z=d[f+n>>0]|0;y=o+48|0;a[y>>0]=((d[((d[t+n>>0]|0)+16-A-(A<<2)+z+((C+w|0)*20|0)>>5)+3984>>0]|0)+1+(d[y>>0]|0)|0)>>>1;y=z+C|0;A=d[f+p>>0]|0;D=o+32|0;a[D>>0]=((d[(v+16-y-(y<<2)+A+((w+x|0)*20|0)>>5)+3984>>0]|0)+1+(d[D>>0]|0)|0)>>>1;D=d[f>>0]|0;y=A+w|0;v=o+16|0;a[v>>0]=((d[(C+16-y-(y<<2)+D+((z+x|0)*20|0)>>5)+3984>>0]|0)+1+(d[v>>0]|0)|0)>>>1;v=D+x|0;a[o>>0]=((d[(w+16-v-(v<<2)+(d[f+s>>0]|0)+((A+z|0)*20|0)>>5)+3984>>0]|0)+1+(d[o>>0]|0)|0)>>>1;B=B+-1|0;if(!B)break;else{o=o+1|0;f=f+1|0;t=t+1|0}}G=g;H=k+j|0;I=r+j|0}q=q+-1|0;if(!q)break;else{h=G+b|0;k=H+c|0;r=I+c|0}}i=m;return}function cc(b,e,f,g,h,j,k,l){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;m=i;i=i+1792|0;n=m+1344|0;o=m;if(((f|0)>=0?!((f+5+k|0)>>>0>h>>>0|(g|0)<0):0)?(g+5+l|0)>>>0<=j>>>0:0){p=l+5|0;q=b;r=h;s=f+5|0;t=g}else{u=k+5|0;v=l+5|0;Wb(b,n,f,g,h,j,u,v,u);p=v;q=n;r=u;s=5;t=0}if(p){u=k>>>2;n=(u|0)==0;v=r-k|0;j=u<<2;h=o;g=q+(s+(Z(t,r)|0))|0;r=p;while(1){if(n){w=h;x=g}else{p=h+(j<<2)|0;t=h;s=g;q=d[g+-1>>0]|0;f=d[g+-2>>0]|0;b=d[g+-3>>0]|0;y=d[g+-4>>0]|0;z=d[g+-5>>0]|0;A=u;while(1){B=y+q|0;C=y;y=d[s>>0]|0;c[t>>2]=z-B-(B<<2)+y+((b+f|0)*20|0);B=y+b|0;D=b;b=d[s+1>>0]|0;c[t+4>>2]=C-B+b-(B<<2)+((f+q|0)*20|0);B=b+f|0;C=f;f=d[s+2>>0]|0;c[t+8>>2]=D-B+f-(B<<2)+((y+q|0)*20|0);B=f+q|0;D=d[s+3>>0]|0;c[t+12>>2]=C-B+D-(B<<2)+((b+y|0)*20|0);A=A+-1|0;if(!A)break;else{B=q;t=t+16|0;s=s+4|0;q=D;z=B}}w=p;x=g+j|0}r=r+-1|0;if(!r)break;else{h=w;g=x+v|0}}}v=l>>>2;if(!v){i=m;return}l=(k|0)==0;x=64-k|0;g=k*3|0;w=0-k|0;h=w<<1;r=k<<1;j=e;e=o+(k<<2)|0;u=o+(k*6<<2)|0;o=v;while(1){if(l){E=j;F=e;G=u}else{v=j+k|0;n=j;z=e;q=u;s=k;while(1){t=c[q+(h<<2)>>2]|0;A=c[q+(w<<2)>>2]|0;y=c[q+(k<<2)>>2]|0;b=c[q>>2]|0;f=y+t|0;B=c[z+(r<<2)>>2]|0;a[n+48>>0]=a[((c[q+(r<<2)>>2]|0)+512-f-(f<<2)+B+((b+A|0)*20|0)>>10)+3984>>0]|0;f=B+b|0;D=c[z+(k<<2)>>2]|0;a[n+32>>0]=a[(y+512-f-(f<<2)+D+((A+t|0)*20|0)>>10)+3984>>0]|0;f=c[z>>2]|0;y=D+A|0;a[n+16>>0]=a[(b+512-y-(y<<2)+f+((B+t|0)*20|0)>>10)+3984>>0]|0;y=f+t|0;a[n>>0]=a[(A+512-y-(y<<2)+(c[z+(w<<2)>>2]|0)+((D+B|0)*20|0)>>10)+3984>>0]|0;s=s+-1|0;if(!s)break;else{n=n+1|0;z=z+4|0;q=q+4|0}}E=v;F=e+(k<<2)|0;G=u+(k<<2)|0}o=o+-1|0;if(!o)break;else{j=E+x|0;e=F+(g<<2)|0;u=G+(g<<2)|0}}i=m;return}function dc(b,e,f,g,h,j,k,l,m){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;n=i;i=i+1792|0;o=n+1344|0;p=n;if(((f|0)>=0?!((f+5+k|0)>>>0>h>>>0|(g|0)<0):0)?(g+5+l|0)>>>0<=j>>>0:0){q=l+5|0;r=b;s=h;t=f+5|0;u=g}else{v=k+5|0;w=l+5|0;Wb(b,o,f,g,h,j,v,w,v);q=w;r=o;s=v;t=5;u=0}if(q){v=k>>>2;o=(v|0)==0;w=s-k|0;j=v<<2;h=p;g=r+(t+(Z(u,s)|0))|0;s=q;while(1){if(o){x=h;y=g}else{q=h+(j<<2)|0;u=h;t=g;r=d[g+-1>>0]|0;f=d[g+-2>>0]|0;b=d[g+-3>>0]|0;z=d[g+-4>>0]|0;A=d[g+-5>>0]|0;B=v;while(1){C=z+r|0;D=z;z=d[t>>0]|0;c[u>>2]=A-C-(C<<2)+z+((b+f|0)*20|0);C=z+b|0;E=b;b=d[t+1>>0]|0;c[u+4>>2]=D-C+b-(C<<2)+((f+r|0)*20|0);C=b+f|0;D=f;f=d[t+2>>0]|0;c[u+8>>2]=E-C+f-(C<<2)+((z+r|0)*20|0);C=f+r|0;E=d[t+3>>0]|0;c[u+12>>2]=D-C+E-(C<<2)+((b+z|0)*20|0);B=B+-1|0;if(!B)break;else{C=r;u=u+16|0;t=t+4|0;r=E;A=C}}x=q;y=g+j|0}s=s+-1|0;if(!s)break;else{h=x;g=y+w|0}}}w=l>>>2;if(!w){i=n;return}l=(k|0)==0;y=64-k|0;g=k*3|0;x=0-k|0;h=x<<1;s=k<<1;j=e;e=p+(k<<2)|0;v=p+((Z(m+2|0,k)|0)+k<<2)|0;m=p+(k*6<<2)|0;p=w;while(1){if(l){F=j;G=e;H=v;I=m}else{w=v+(k<<2)|0;o=j+k|0;A=j;r=e;t=v;u=m;B=k;while(1){z=c[u+(h<<2)>>2]|0;b=c[u+(x<<2)>>2]|0;f=c[u+(k<<2)>>2]|0;C=c[u>>2]|0;E=f+z|0;D=c[r+(s<<2)>>2]|0;a[A+48>>0]=((d[((c[u+(s<<2)>>2]|0)+512-E-(E<<2)+D+((C+b|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[t+(s<<2)>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;E=D+C|0;J=c[r+(k<<2)>>2]|0;a[A+32>>0]=((d[(f+512-E-(E<<2)+J+((b+z|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[t+(k<<2)>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;E=c[r>>2]|0;f=J+b|0;a[A+16>>0]=((d[(C+512-f-(f<<2)+E+((D+z|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[t>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;f=E+z|0;a[A>>0]=((d[(b+512-f-(f<<2)+(c[r+(x<<2)>>2]|0)+((J+D|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[t+(x<<2)>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;B=B+-1|0;if(!B)break;else{A=A+1|0;r=r+4|0;t=t+4|0;u=u+4|0}}F=o;G=e+(k<<2)|0;H=w;I=m+(k<<2)|0}p=p+-1|0;if(!p)break;else{j=F+y|0;e=G+(g<<2)|0;v=H+(g<<2)|0;m=I+(g<<2)|0}}i=n;return}function ec(b,e,f,g,h,j,k,l,m){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;n=i;i=i+1792|0;o=n+1344|0;p=n;q=k+5|0;if(((f|0)>=0?!((f+5+k|0)>>>0>h>>>0|(g|0)<0):0)?(g+5+l|0)>>>0<=j>>>0:0){r=b;s=h;t=f;u=g}else{Wb(b,o,f,g,h,j,q,l+5|0,q);r=o;s=q;t=0;u=0}o=t+s+(Z(u,s)|0)|0;u=l>>>2;if(u){t=(q|0)==0;j=(s<<2)-k+-5|0;h=q*3|0;g=0-s|0;f=g<<1;b=s<<1;v=q<<1;w=-5-k|0;x=p+(q<<2)|0;y=r+o|0;z=r+(o+(s*5|0))|0;o=u;while(1){if(t){A=x;B=y;C=z}else{u=x+(q<<2)|0;r=x;D=y;E=z;F=q;while(1){G=d[E+f>>0]|0;H=d[E+g>>0]|0;I=d[E+s>>0]|0;J=d[E>>0]|0;K=I+G|0;L=d[D+b>>0]|0;c[r+(v<<2)>>2]=(d[E+b>>0]|0)-K-(K<<2)+L+((J+H|0)*20|0);K=L+J|0;M=d[D+s>>0]|0;c[r+(q<<2)>>2]=I-K+M-(K<<2)+((H+G|0)*20|0);K=d[D>>0]|0;I=M+H|0;c[r>>2]=J-I+K-(I<<2)+((L+G|0)*20|0);I=K+G|0;c[r+(w<<2)>>2]=H-I+(d[D+g>>0]|0)-(I<<2)+((M+L|0)*20|0);F=F+-1|0;if(!F)break;else{r=r+4|0;D=D+1|0;E=E+1|0}}A=u;B=y+q|0;C=z+q|0}o=o+-1|0;if(!o)break;else{x=A+(h<<2)|0;y=B+j|0;z=C+j|0}}}if(!l){i=n;return}j=k>>>2;C=(j|0)==0;z=16-k|0;k=j<<2;B=e;e=p+(m+2<<2)|0;m=p+20|0;p=l;while(1){if(C){N=B;O=e;P=m}else{l=e+(k<<2)|0;y=B;h=e;A=m;x=c[m+-4>>2]|0;o=c[m+-8>>2]|0;q=c[m+-12>>2]|0;g=c[m+-16>>2]|0;w=c[m+-20>>2]|0;s=j;while(1){b=g+x|0;v=g;g=c[A>>2]|0;a[y>>0]=((d[(w+512-b-(b<<2)+g+((q+o|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[h>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;b=g+q|0;f=q;q=c[A+4>>2]|0;a[y+1>>0]=((d[(v+512-b-(b<<2)+q+((o+x|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[h+4>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;b=q+o|0;v=o;o=c[A+8>>2]|0;a[y+2>>0]=((d[(f+512-b-(b<<2)+o+((g+x|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[h+8>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;b=o+x|0;f=c[A+12>>2]|0;a[y+3>>0]=((d[(v+512-b-(b<<2)+f+((q+g|0)*20|0)>>10)+3984>>0]|0)+1+(d[((c[h+12>>2]|0)+16>>5)+3984>>0]|0)|0)>>>1;s=s+-1|0;if(!s)break;else{b=x;y=y+4|0;h=h+16|0;A=A+16|0;x=f;w=b}}N=B+k|0;O=l;P=m+(k<<2)|0}p=p+-1|0;if(!p)break;else{B=N+z|0;e=O+20|0;m=P+20|0}}i=n;return}function fc(a,d,e,f,g,h,j,k,l){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;m=i;n=a+((j<<4)+h)|0;o=b[d>>1]|0;p=d+2|0;q=b[p>>1]|0;r=e+4|0;s=c[r>>2]<<4;t=e+8|0;u=c[t>>2]<<4;v=h+f|0;f=v+(o>>2)|0;w=j+g|0;g=w+(q>>2)|0;do switch(c[6800+((o&3)<<4)+((q&3)<<2)>>2]|0){case 7:{bc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,2);break}case 11:{dc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,1);break}case 8:{$b(c[e>>2]|0,n,f+-2|0,g,s,u,k,l);break}case 0:{Wb(c[e>>2]|0,n,f,g,s,u,k,l,16);break}case 3:{_b(c[e>>2]|0,n,f,g+-2|0,s,u,k,l,1);break}case 4:{ac(c[e>>2]|0,n,f+-2|0,g,s,u,k,l,0);break}case 13:{bc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,1);break}case 10:{cc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l);break}case 14:{ec(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,1);break}case 6:{ec(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,0);break}case 2:{Zb(c[e>>2]|0,n,f,g+-2|0,s,u,k,l);break}case 12:{ac(c[e>>2]|0,n,f+-2|0,g,s,u,k,l,1);break}case 1:{_b(c[e>>2]|0,n,f,g+-2|0,s,u,k,l,0);break}case 5:{bc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,0);break}case 9:{dc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,0);break}default:bc(c[e>>2]|0,n,f+-2|0,g+-2|0,s,u,k,l,3)}while(0);u=(h>>>1)+256+(j>>>1<<3)|0;j=a+u|0;h=c[r>>2]|0;r=h<<3;s=c[t>>2]|0;t=s<<3;g=b[d>>1]|0;d=(g>>3)+(v>>>1)|0;v=b[p>>1]|0;p=(v>>3)+(w>>>1)|0;w=g&7;g=v&7;v=k>>>1;k=l>>>1;l=c[e>>2]|0;e=Z(h<<8,s)|0;s=l+e|0;h=(w|0)!=0;f=(g|0)!=0;if(h&f){Yb(s,j,d,p,r,t,w,g,v,k);i=m;return}if(h){Vb(s,j,d,p,r,t,w,v,k);i=m;return}if(f){Xb(s,j,d,p,r,t,g,v,k);i=m;return}else{Wb(s,j,d,p,r,t,v,k,8);Wb(l+((Z(t,r)|0)+e)|0,a+(u+64)|0,d,p,r,t,v,k,8);i=m;return}}function gc(b,c,d,e,f){b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;if(!d)h=c;else{qd(c|0,a[b>>0]|0,d|0)|0;h=c+d|0}if(!e){j=h;k=b}else{d=h+e|0;c=e;l=h;h=b;while(1){a[l>>0]=a[h>>0]|0;c=c+-1|0;if(!c)break;else{l=l+1|0;h=h+1|0}}j=d;k=b+e|0}if(!f){i=g;return}qd(j|0,a[k+-1>>0]|0,f|0)|0;i=g;return}function hc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;e=i;kd(b,a,d);i=e;return}function ic(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;f=i;g=c[a+40>>2]|0;if(g){h=c[a>>2]|0;j=a+32|0;k=0;do{if(((c[h+(k*40|0)+20>>2]|0)+-1|0)>>>0<2){l=c[h+(k*40|0)+12>>2]|0;if(l>>>0>d>>>0)m=l-(c[j>>2]|0)|0;else m=l;c[h+(k*40|0)+8>>2]=m}k=k+1|0}while((k|0)!=(g|0))}if(!(c[b>>2]|0)){n=0;i=f;return n|0}g=c[b+4>>2]|0;if(g>>>0>=3){n=0;i=f;return n|0}k=a+32|0;m=a+24|0;h=a+4|0;j=g;g=d;l=0;while(1){a:do if(j>>>0<2){o=c[b+(l*12|0)+8>>2]|0;if(!j){p=g-o|0;if((p|0)<0)q=(c[k>>2]|0)+p|0;else q=p}else{p=o+g|0;o=c[k>>2]|0;q=p-((p|0)<(o|0)?0:o)|0}if(q>>>0>d>>>0)r=q-(c[k>>2]|0)|0;else r=q;o=c[m>>2]|0;p=0;while(1){s=p>>>0<o>>>0;t=0;while(1){if(!(s&(t|0)==0)){u=t;v=p;w=q;break a}x=c[a>>2]|0;if(((c[x+(p*40|0)+20>>2]|0)+-1|0)>>>0>=2)break;if((c[x+(p*40|0)+8>>2]|0)==(r|0))t=1;else break}p=p+1|0}}else{p=c[b+(l*12|0)+12>>2]|0;o=c[m>>2]|0;t=0;while(1){s=t>>>0<o>>>0;x=0;while(1){if(!(s&(x|0)==0)){u=x;v=t;w=g;break a}y=c[a>>2]|0;if((c[y+(t*40|0)+20>>2]|0)!=3)break;if((c[y+(t*40|0)+8>>2]|0)==(p|0))x=1;else break}t=t+1|0}}while(0);t=(u|0)==0?-1:v;if((t|0)<0){n=1;z=40;break}p=c[a>>2]|0;if((c[p+(t*40|0)+20>>2]|0)>>>0<=1){n=1;z=40;break}if(l>>>0<e>>>0){o=e;do{x=o;o=o+-1|0;s=c[h>>2]|0;c[s+(x<<2)>>2]=c[s+(o<<2)>>2]}while(o>>>0>l>>>0);A=c[a>>2]|0}else A=p;c[(c[h>>2]|0)+(l<<2)>>2]=A+(t*40|0);l=l+1|0;if(l>>>0<=e>>>0){o=l;s=l;while(1){x=c[h>>2]|0;y=c[x+(o<<2)>>2]|0;if((y|0)==((c[a>>2]|0)+(t*40|0)|0))B=s;else{c[x+(s<<2)>>2]=y;B=s+1|0}o=o+1|0;if(o>>>0>e>>>0)break;else s=B}}j=c[b+(l*12|0)+4>>2]|0;if(j>>>0>=3){n=0;z=40;break}else g=w}if((z|0)==40){i=f;return n|0}return 0}function jc(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0;k=i;l=a+8|0;m=c[l>>2]|0;if((c[d>>2]|0)!=(c[m>>2]|0)){n=1;i=k;return n|0}d=a+52|0;c[d>>2]=0;o=a+56|0;p=(c[o>>2]|0)==0;q=p&1;do if(!b){c[m+20>>2]=0;c[m+12>>2]=e;c[m+8>>2]=e;c[m+16>>2]=f;c[m+24>>2]=q;if(p){r=a+44|0;c[r>>2]=(c[r>>2]|0)+1;s=0}else s=0}else{if(g){r=a+20|0;c[r>>2]=0;t=a+16|0;c[t>>2]=0;u=c[a>>2]|0;v=a+44|0;w=0;do{x=u+(w*40|0)+20|0;if((c[x>>2]|0)!=0?(c[x>>2]=0,(c[u+(w*40|0)+24>>2]|0)==0):0)c[v>>2]=(c[v>>2]|0)+-1;w=w+1|0}while((w|0)!=16);do{}while((tc(a)|0)==0);w=a+40|0;c[w>>2]=0;u=a+36|0;c[u>>2]=65535;c[a+48>>2]=0;if(!((c[b>>2]|0)==0?(c[o>>2]|0)==0:0)){c[t>>2]=0;c[r>>2]=0}x=(c[b+4>>2]|0)==0;y=c[l>>2]|0;c[y+20>>2]=x?2:3;c[u>>2]=x?65535:0;c[y+12>>2]=0;c[y+8>>2]=0;c[y+16>>2]=0;c[y+24>>2]=q;c[v>>2]=1;c[w>>2]=1;s=0;break}if(!(c[b+8>>2]|0)){w=a+40|0;y=c[w>>2]|0;x=c[a+24>>2]|0;if(y>>>0>=x>>>0)if(y){u=c[a>>2]|0;z=0;A=-1;B=0;while(1){if(((c[u+(z*40|0)+20>>2]|0)+-1|0)>>>0<2){C=c[u+(z*40|0)+8>>2]|0;D=(C|0)<(B|0)|(A|0)==-1;E=D?z:A;F=D?C:B}else{E=A;F=B}z=z+1|0;if((z|0)==(y|0))break;else{A=E;B=F}}if((E|0)>-1){B=y+-1|0;c[u+(E*40|0)+20>>2]=0;c[w>>2]=B;if(!(c[u+(E*40|0)+24>>2]|0)){A=a+44|0;c[A>>2]=(c[A>>2]|0)+-1;G=B;H=x;I=e;J=0}else{G=B;H=x;I=e;J=0}}else{G=y;H=x;I=e;J=1}}else{G=0;H=x;I=e;J=1}else{G=y;H=x;I=e;J=0}}else{B=a+24|0;A=a+40|0;z=a+44|0;v=a+36|0;r=a+48|0;t=e;C=0;D=0;a:while(1){switch(c[b+(C*20|0)+12>>2]|0){case 5:{K=c[a>>2]|0;L=0;do{M=K+(L*40|0)+20|0;if((c[M>>2]|0)!=0?(c[M>>2]=0,(c[K+(L*40|0)+24>>2]|0)==0):0)c[z>>2]=(c[z>>2]|0)+-1;L=L+1|0}while((L|0)!=16);do{}while((tc(a)|0)==0);c[A>>2]=0;c[v>>2]=65535;c[r>>2]=0;c[d>>2]=1;N=0;O=D;break}case 1:{L=t-(c[b+(C*20|0)+16>>2]|0)|0;K=c[B>>2]|0;M=0;b:while(1){P=M>>>0<K>>>0;Q=1;while(1){if(!(P&Q))break b;R=c[a>>2]|0;if(((c[R+(M*40|0)+20>>2]|0)+-1|0)>>>0>=2)break;if((c[R+(M*40|0)+8>>2]|0)==(L|0))Q=0;else break}M=M+1|0}L=Q?-1:M;if((L|0)<0){S=1;break a}K=c[a>>2]|0;c[K+(L*40|0)+20>>2]=0;c[A>>2]=(c[A>>2]|0)+-1;if(!(c[K+(L*40|0)+24>>2]|0)){c[z>>2]=(c[z>>2]|0)+-1;N=t;O=D}else{N=t;O=D}break}case 6:{L=c[b+(C*20|0)+24>>2]|0;K=c[v>>2]|0;if((K|0)==65535|K>>>0<L>>>0){T=1;U=90;break a}K=c[B>>2]|0;c:do if(K){P=c[a>>2]|0;R=0;while(1){V=P+(R*40|0)+20|0;if((c[V>>2]|0)==3?(c[P+(R*40|0)+8>>2]|0)==(L|0):0)break;W=R+1|0;if(W>>>0<K>>>0)R=W;else{X=K;U=77;break c}}c[V>>2]=0;W=(c[A>>2]|0)+-1|0;c[A>>2]=W;if(!(c[P+(R*40|0)+24>>2]|0)){c[z>>2]=(c[z>>2]|0)+-1;Y=W;Z=K}else{Y=W;Z=K}}else{X=0;U=77}while(0);if((U|0)==77){U=0;Y=c[A>>2]|0;Z=X}if(Y>>>0>=Z>>>0){T=1;U=90;break a}K=c[l>>2]|0;c[K+12>>2]=t;c[K+8>>2]=L;c[K+16>>2]=f;c[K+20>>2]=3;c[K+24>>2]=(c[o>>2]|0)==0&1;c[A>>2]=Y+1;c[z>>2]=(c[z>>2]|0)+1;N=t;O=1;break}case 2:{K=c[b+(C*20|0)+20>>2]|0;M=c[B>>2]|0;W=0;d:while(1){_=W>>>0<M>>>0;$=1;while(1){if(!(_&$))break d;aa=c[a>>2]|0;if((c[aa+(W*40|0)+20>>2]|0)!=3)break;if((c[aa+(W*40|0)+8>>2]|0)==(K|0))$=0;else break}W=W+1|0}K=$?-1:W;if((K|0)<0){S=1;break a}M=c[a>>2]|0;c[M+(K*40|0)+20>>2]=0;c[A>>2]=(c[A>>2]|0)+-1;if(!(c[M+(K*40|0)+24>>2]|0)){c[z>>2]=(c[z>>2]|0)+-1;N=t;O=D}else{N=t;O=D}break}case 0:{T=0;U=90;break a;break}case 4:{K=c[b+(C*20|0)+28>>2]|0;c[v>>2]=K;M=c[B>>2]|0;if(!M){N=t;O=D}else{L=c[a>>2]|0;_=K;R=0;while(1){P=L+(R*40|0)+20|0;do if((c[P>>2]|0)==3){if((c[L+(R*40|0)+8>>2]|0)>>>0<=K>>>0)if((_|0)==65535)ba=65535;else{ca=_;break}else ba=_;c[P>>2]=0;c[A>>2]=(c[A>>2]|0)+-1;if(!(c[L+(R*40|0)+24>>2]|0)){c[z>>2]=(c[z>>2]|0)+-1;ca=ba}else ca=ba}else ca=_;while(0);R=R+1|0;if((R|0)==(M|0)){N=t;O=D;break}else _=ca}}break}case 3:{_=c[b+(C*20|0)+16>>2]|0;M=c[b+(C*20|0)+24>>2]|0;R=c[v>>2]|0;if((R|0)==65535|R>>>0<M>>>0){S=1;break a}R=c[B>>2]|0;e:do if(R){L=c[a>>2]|0;K=0;while(1){da=L+(K*40|0)+20|0;if((c[da>>2]|0)==3?(c[L+(K*40|0)+8>>2]|0)==(M|0):0)break;W=K+1|0;if(W>>>0<R>>>0)K=W;else{ea=R;break e}}c[da>>2]=0;c[A>>2]=(c[A>>2]|0)+-1;if(!(c[L+(K*40|0)+24>>2]|0)){c[z>>2]=(c[z>>2]|0)+-1;ea=R}else ea=R}else ea=0;while(0);R=t-_|0;W=0;f:while(1){P=W>>>0<ea>>>0;fa=1;while(1){if(!(P&fa))break f;aa=c[a>>2]|0;if(((c[aa+(W*40|0)+20>>2]|0)+-1|0)>>>0>=2)break;if((c[aa+(W*40|0)+8>>2]|0)==(R|0))fa=0;else break}W=W+1|0}R=fa?-1:W;if((R|0)<0){S=1;break a}_=c[a>>2]|0;P=_+(R*40|0)+20|0;if((c[P>>2]|0)>>>0<=1){S=1;break a}c[P>>2]=3;c[_+(R*40|0)+8>>2]=M;N=t;O=D;break}default:{S=1;break a}}t=N;C=C+1|0;D=O}if((U|0)==90)S=T;if(D){s=S;break}G=c[A>>2]|0;H=c[B>>2]|0;I=t;J=S}if(G>>>0<H>>>0){C=c[l>>2]|0;c[C+12>>2]=I;c[C+8>>2]=I;c[C+16>>2]=f;c[C+20>>2]=2;c[C+24>>2]=q;C=a+44|0;c[C>>2]=(c[C>>2]|0)+1;c[a+40>>2]=G+1;s=J}else s=1}while(0);J=c[l>>2]|0;c[J+36>>2]=g;c[J+28>>2]=h;c[J+32>>2]=j;if(!(c[o>>2]|0)){o=a+44|0;l=a+28|0;G=c[l>>2]|0;if((c[o>>2]|0)>>>0>G>>>0){do{tc(a)|0;q=c[l>>2]|0}while((c[o>>2]|0)>>>0>q>>>0);ga=q}else ga=G}else{G=a+16|0;o=c[G>>2]|0;l=c[a+12>>2]|0;c[l+(o<<4)>>2]=c[J>>2];c[l+(o<<4)+12>>2]=g;c[l+(o<<4)+4>>2]=h;c[l+(o<<4)+8>>2]=j;c[G>>2]=o+1;ga=c[a+28>>2]|0}uc(c[a>>2]|0,ga+1|0);n=s;i=k;return n|0}function kc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;if((b>>>0<=16?(e=c[(c[a+4>>2]|0)+(b<<2)>>2]|0,(e|0)!=0):0)?(c[e+20>>2]|0)>>>0>1:0)f=c[e>>2]|0;else f=0;i=d;return f|0}function lc(a){a=a|0;var b=0;b=(c[a>>2]|0)+((c[a+28>>2]|0)*40|0)|0;c[a+8>>2]=b;return c[b>>2]|0}function mc(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;h=i;c[a+36>>2]=65535;j=e>>>0>1?e:1;c[a+24>>2]=j;e=a+28|0;c[e>>2]=(g|0)==0?d:j;c[a+32>>2]=f;c[a+56>>2]=g;c[a+44>>2]=0;c[a+40>>2]=0;c[a+48>>2]=0;g=id(680)|0;c[a>>2]=g;if(!g){k=65535;i=h;return k|0}ld(g,0,680);a:do if((c[e>>2]|0)!=-1){g=b*384|47;f=0;while(1){j=id(g)|0;d=c[a>>2]|0;c[d+(f*40|0)+4>>2]=j;if(!j){k=65535;break}c[d+(f*40|0)>>2]=j+(0-j&15);f=f+1|0;if(f>>>0>=((c[e>>2]|0)+1|0)>>>0)break a}i=h;return k|0}while(0);b=a+4|0;c[b>>2]=id(68)|0;f=id((c[e>>2]<<4)+16|0)|0;c[a+12>>2]=f;e=c[b>>2]|0;if((e|0)==0|(f|0)==0){k=65535;i=h;return k|0}ld(e,0,68);c[a+20>>2]=0;c[a+16>>2]=0;k=0;i=h;return k|0}function nc(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=i;oc(a);h=mc(a,b,c,d,e,f)|0;i=g;return h|0}function oc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;b=i;d=c[a>>2]|0;if(d){e=a+28|0;if((c[e>>2]|0)==-1)f=d;else{g=d;d=0;while(1){jd(c[g+(d*40|0)+4>>2]|0);h=c[a>>2]|0;c[h+(d*40|0)+4>>2]=0;d=d+1|0;if(d>>>0>=((c[e>>2]|0)+1|0)>>>0){f=h;break}else g=h}}}else f=0;jd(f);c[a>>2]=0;f=a+4|0;jd(c[f>>2]|0);c[f>>2]=0;f=a+12|0;jd(c[f>>2]|0);c[f>>2]=0;i=b;return}function pc(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;d=c[a+40>>2]|0;if(!d){i=b;return}e=a+4|0;f=0;do{c[(c[e>>2]|0)+(f<<2)>>2]=(c[a>>2]|0)+(f*40|0);f=f+1|0}while(f>>>0<d>>>0);i=b;return}function qc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;f=i;g=a+16|0;c[g>>2]=0;c[a+20>>2]=0;if(!e){h=0;i=f;return h|0}e=a+48|0;j=c[e>>2]|0;k=(j|0)==(b|0);a:do if(!k?(l=a+32|0,m=c[l>>2]|0,n=((j+1|0)>>>0)%(m>>>0)|0,(n|0)!=(b|0)):0){o=a+28|0;p=c[(c[a>>2]|0)+((c[o>>2]|0)*40|0)>>2]|0;q=a+40|0;r=a+24|0;s=a+44|0;t=m;m=n;while(1){n=c[q>>2]|0;if(!n)u=0;else{v=c[a>>2]|0;w=0;do{if(((c[v+(w*40|0)+20>>2]|0)+-1|0)>>>0<2){x=c[v+(w*40|0)+12>>2]|0;c[v+(w*40|0)+8>>2]=x-(x>>>0>m>>>0?t:0)}w=w+1|0}while((w|0)!=(n|0));u=n}if(u>>>0>=(c[r>>2]|0)>>>0){if(!u){h=1;y=38;break}n=c[a>>2]|0;w=0;v=-1;x=0;while(1){if(((c[n+(w*40|0)+20>>2]|0)+-1|0)>>>0<2){z=c[n+(w*40|0)+8>>2]|0;A=(z|0)<(x|0)|(v|0)==-1;B=A?w:v;C=A?z:x}else{B=v;C=x}w=w+1|0;if((w|0)==(u|0))break;else{v=B;x=C}}if((B|0)<=-1){h=1;y=38;break}x=u+-1|0;c[n+(B*40|0)+20>>2]=0;c[q>>2]=x;if(!(c[n+(B*40|0)+24>>2]|0)){c[s>>2]=(c[s>>2]|0)+-1;D=x}else D=x}else D=u;x=c[s>>2]|0;v=c[o>>2]|0;if(x>>>0<v>>>0){E=v;F=x;G=D}else{do{tc(a)|0;H=c[s>>2]|0;I=c[o>>2]|0}while(H>>>0>=I>>>0);E=I;F=H;G=c[q>>2]|0}n=c[a>>2]|0;c[n+(E*40|0)+20>>2]=1;c[n+(E*40|0)+12>>2]=m;c[n+(E*40|0)+8>>2]=m;c[n+(E*40|0)+16>>2]=0;c[n+(E*40|0)+24>>2]=0;c[s>>2]=F+1;c[q>>2]=G+1;uc(n,E+1|0);t=c[l>>2]|0;m=((m+1|0)>>>0)%(t>>>0)|0;if((m|0)==(b|0)){y=23;break}}if((y|0)==23){m=c[g>>2]|0;if(!m){y=33;break}t=c[a+12>>2]|0;l=c[o>>2]|0;q=c[a>>2]|0;s=q+(l*40|0)|0;r=c[s>>2]|0;n=0;while(1){if((c[t+(n<<4)>>2]|0)==(r|0))break;n=n+1|0;if(n>>>0>=m>>>0){y=33;break a}}if(!l){y=33;break}else J=0;while(1){K=q+(J*40|0)|0;J=J+1|0;if((c[K>>2]|0)==(p|0))break;if(J>>>0>=l>>>0){y=33;break a}}c[K>>2]=r;c[s>>2]=p;y=33;break}else if((y|0)==38){i=f;return h|0}}else y=31;while(0);if((y|0)==31)if(d)if(k){h=1;i=f;return h|0}else y=33;else L=j;do if((y|0)==33){if(!d){L=c[e>>2]|0;break}c[e>>2]=b;h=0;i=f;return h|0}while(0);if((L|0)==(b|0)){h=0;i=f;return h|0}L=c[a+32>>2]|0;c[e>>2]=((b+-1+L|0)>>>0)%(L>>>0)|0;h=0;i=f;return h|0}function rc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;d=a+20|0;e=c[d>>2]|0;if(e>>>0>=(c[a+16>>2]|0)>>>0){f=0;i=b;return f|0}g=c[a+12>>2]|0;c[d>>2]=e+1;f=g+(e<<4)|0;i=b;return f|0}function sc(a){a=a|0;var b=0;b=i;if(!(c[a>>2]|0)){i=b;return}c[a+60>>2]=1;do{}while((tc(a)|0)==0);i=b;return}function tc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;if(c[a+56>>2]|0){d=1;i=b;return d|0}e=c[a>>2]|0;f=c[a+28>>2]|0;g=0;h=2147483647;j=0;while(1){if(!(c[e+(g*40|0)+24>>2]|0)){k=h;l=j}else{m=c[e+(g*40|0)+16>>2]|0;n=(m|0)<(h|0);k=n?m:h;l=n?e+(g*40|0)|0:j}g=g+1|0;if(g>>>0>f>>>0)break;else{h=k;j=l}}if(!l){d=1;i=b;return d|0}j=a+16|0;k=c[j>>2]|0;h=c[a+12>>2]|0;c[h+(k<<4)>>2]=c[l>>2];c[h+(k<<4)+12>>2]=c[l+36>>2];c[h+(k<<4)+4>>2]=c[l+28>>2];c[h+(k<<4)+8>>2]=c[l+32>>2];c[j>>2]=k+1;c[l+24>>2]=0;if(c[l+20>>2]|0){d=0;i=b;return d|0}l=a+44|0;c[l>>2]=(c[l>>2]|0)+-1;d=0;i=b;return d|0}function uc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;d=i;i=i+32|0;e=d+16|0;f=d;g=7;do{if(g>>>0<b>>>0){h=g;do{j=a+(h*40|0)|0;k=c[j>>2]|0;l=c[j+4>>2]|0;j=c[a+(h*40|0)+8>>2]|0;m=a+(h*40|0)+12|0;n=c[m+4>>2]|0;o=e;c[o>>2]=c[m>>2];c[o+4>>2]=n;n=c[a+(h*40|0)+20>>2]|0;o=c[a+(h*40|0)+24>>2]|0;m=a+(h*40|0)+28|0;c[f+0>>2]=c[m+0>>2];c[f+4>>2]=c[m+4>>2];c[f+8>>2]=c[m+8>>2];a:do if(h>>>0<g>>>0){p=h;q=5}else{m=(n|0)==0;r=(o|0)==0;s=n+-1|0;t=s>>>0<2;u=h;b:while(1){v=u-g|0;w=c[a+(v*40|0)+20>>2]|0;do if(!w)if(m?(c[a+(v*40|0)+24>>2]|0)!=0|r:0)break b;else q=16;else{if(m)break b;x=w+-1|0;if((x|s)>>>0<2){y=c[a+(v*40|0)+8>>2]|0;if((y|0)>(j|0))break b;z=a+(u*40|0)|0;if((y|0)<(j|0)){A=z;break}else{B=z;break a}}if(x>>>0<2)break b;if(!t?(c[a+(v*40|0)+8>>2]|0)<=(j|0):0)break b;else q=16}while(0);if((q|0)==16){q=0;A=a+(u*40|0)|0}w=A+0|0;x=a+(v*40|0)+0|0;z=w+40|0;do{c[w>>2]=c[x>>2];w=w+4|0;x=x+4|0}while((w|0)<(z|0));if(v>>>0<g>>>0){p=v;q=5;break a}else u=v}B=a+(u*40|0)|0}while(0);if((q|0)==5){q=0;B=a+(p*40|0)|0}t=B;c[t>>2]=k;c[t+4>>2]=l;c[B+8>>2]=j;t=e;s=c[t+4>>2]|0;m=B+12|0;c[m>>2]=c[t>>2];c[m+4>>2]=s;c[B+20>>2]=n;c[B+24>>2]=o;s=B+28|0;c[s+0>>2]=c[f+0>>2];c[s+4>>2]=c[f+4>>2];c[s+8>>2]=c[f+8>>2];h=h+1|0}while((h|0)!=(b|0))}g=g>>>1}while((g|0)!=0);i=d;return}function vc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;d=i;e=c[a+4>>2]|0;f=c[a+16>>2]|0;g=c[a+20>>2]|0;h=e<<2;j=b+256|0;k=16;l=c[a+12>>2]|0;a=b;while(1){m=c[a+4>>2]|0;c[l>>2]=c[a>>2];c[l+4>>2]=m;m=c[a+12>>2]|0;c[l+8>>2]=c[a+8>>2];c[l+12>>2]=m;k=k+-1|0;if(!k)break;else{l=l+(h<<2)|0;a=a+16|0}}a=e<<1&2147483646;h=c[b+260>>2]|0;c[f>>2]=c[j>>2];c[f+4>>2]=h;h=c[b+268>>2]|0;c[f+(a<<2)>>2]=c[b+264>>2];c[f+((a|1)<<2)>>2]=h;h=e<<2;j=c[b+276>>2]|0;c[f+(h<<2)>>2]=c[b+272>>2];c[f+((h|1)<<2)>>2]=j;j=h+a|0;h=c[b+284>>2]|0;c[f+(j<<2)>>2]=c[b+280>>2];c[f+((j|1)<<2)>>2]=h;h=j+a|0;j=c[b+292>>2]|0;c[f+(h<<2)>>2]=c[b+288>>2];c[f+((h|1)<<2)>>2]=j;j=h+a|0;h=c[b+300>>2]|0;c[f+(j<<2)>>2]=c[b+296>>2];c[f+((j|1)<<2)>>2]=h;h=j+a|0;j=c[b+308>>2]|0;c[f+(h<<2)>>2]=c[b+304>>2];c[f+((h|1)<<2)>>2]=j;j=h+a|0;h=c[b+316>>2]|0;c[f+(j<<2)>>2]=c[b+312>>2];c[f+((j|1)<<2)>>2]=h;h=c[b+324>>2]|0;c[g>>2]=c[b+320>>2];c[g+4>>2]=h;h=c[b+332>>2]|0;c[g+(a<<2)>>2]=c[b+328>>2];c[g+((a|1)<<2)>>2]=h;h=e<<2;e=c[b+340>>2]|0;c[g+(h<<2)>>2]=c[b+336>>2];c[g+((h|1)<<2)>>2]=e;e=h+a|0;h=c[b+348>>2]|0;c[g+(e<<2)>>2]=c[b+344>>2];c[g+((e|1)<<2)>>2]=h;h=e+a|0;e=c[b+356>>2]|0;c[g+(h<<2)>>2]=c[b+352>>2];c[g+((h|1)<<2)>>2]=e;e=h+a|0;h=c[b+364>>2]|0;c[g+(e<<2)>>2]=c[b+360>>2];c[g+((e|1)<<2)>>2]=h;h=e+a|0;e=c[b+372>>2]|0;c[g+(h<<2)>>2]=c[b+368>>2];c[g+((h|1)<<2)>>2]=e;e=h+a|0;a=c[b+380>>2]|0;c[g+(e<<2)>>2]=c[b+376>>2];c[g+((e|1)<<2)>>2]=a;i=d;return}function wc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;h=i;j=c[b+4>>2]|0;k=Z(c[b+8>>2]|0,j)|0;l=(e>>>0)%(j>>>0)|0;m=c[b>>2]|0;b=e-l|0;e=(b<<8)+(l<<4)|0;n=k<<8;o=l<<3;l=j<<4;p=j<<2&1073741820;q=p<<1;r=q+p|0;s=0;do{t=c[3344+(s<<2)>>2]|0;u=c[3408+(s<<2)>>2]|0;v=(u<<4)+t|0;w=f+v|0;x=e+t+(Z(u,l)|0)|0;u=m+x|0;t=c[g+(s<<6)>>2]|0;if((t|0)==16777215){y=c[f+(v+16)>>2]|0;c[u>>2]=c[w>>2];c[u+(p<<2)>>2]=y;y=c[f+(v+48)>>2]|0;c[u+(q<<2)>>2]=c[f+(v+32)>>2];c[u+(r<<2)>>2]=y}else{y=d[f+(v+1)>>0]|0;z=c[g+(s<<6)+4>>2]|0;a[u>>0]=a[3472+(t+512+(d[w>>0]|0))>>0]|0;w=d[f+(v+2)>>0]|0;t=c[g+(s<<6)+8>>2]|0;a[m+(x+1)>>0]=a[3472+((y|512)+z)>>0]|0;z=d[f+(v+3)>>0]|0;y=c[g+(s<<6)+12>>2]|0;a[m+(x+2)>>0]=a[3472+(t+512+w)>>0]|0;a[m+(x+3)>>0]=a[3472+(y+512+z)>>0]|0;z=x+l|0;x=d[f+(v+17)>>0]|0;y=c[g+(s<<6)+20>>2]|0;a[m+z>>0]=a[3472+((c[g+(s<<6)+16>>2]|0)+512+(d[f+(v+16)>>0]|0))>>0]|0;w=d[f+(v+18)>>0]|0;t=c[g+(s<<6)+24>>2]|0;a[m+(z+1)>>0]=a[3472+((x|512)+y)>>0]|0;y=d[f+(v+19)>>0]|0;x=c[g+(s<<6)+28>>2]|0;a[m+(z+2)>>0]=a[3472+(t+512+w)>>0]|0;a[m+(z+3)>>0]=a[3472+(x+512+y)>>0]|0;y=z+l|0;z=d[f+(v+33)>>0]|0;x=c[g+(s<<6)+36>>2]|0;a[m+y>>0]=a[3472+((c[g+(s<<6)+32>>2]|0)+512+(d[f+(v+32)>>0]|0))>>0]|0;w=d[f+(v+34)>>0]|0;t=c[g+(s<<6)+40>>2]|0;a[m+(y+1)>>0]=a[3472+((z|512)+x)>>0]|0;x=d[f+(v+35)>>0]|0;z=c[g+(s<<6)+44>>2]|0;a[m+(y+2)>>0]=a[3472+(t+512+w)>>0]|0;a[m+(y+3)>>0]=a[3472+(z+512+x)>>0]|0;x=y+l|0;y=d[f+(v+49)>>0]|0;z=c[g+(s<<6)+52>>2]|0;a[m+x>>0]=a[3472+((c[g+(s<<6)+48>>2]|0)+512+(d[f+(v+48)>>0]|0))>>0]|0;w=d[f+(v+50)>>0]|0;t=c[g+(s<<6)+56>>2]|0;a[m+(x+1)>>0]=a[3472+((y|512)+z)>>0]|0;z=d[f+(v+51)>>0]|0;v=c[g+(s<<6)+60>>2]|0;a[m+(x+2)>>0]=a[3472+(t+512+w)>>0]|0;a[m+(x+3)>>0]=a[3472+(v+512+z)>>0]|0}s=s+1|0}while((s|0)!=16);s=k<<6;k=j<<3&2147483640;j=f+256|0;l=f+320|0;f=o+n+(b<<6)|0;b=k>>>2;n=k>>>1;o=n+b|0;r=16;do{q=r&3;p=c[3344+(q<<2)>>2]|0;e=c[3408+(q<<2)>>2]|0;q=r>>>0>19;z=q?l:j;v=(e<<3)+p|0;x=z+v|0;w=f+(q?s:0)+p+(Z(e,k)|0)|0;e=m+w|0;p=c[g+(r<<6)>>2]|0;if((p|0)==16777215){q=c[z+(v+8)>>2]|0;c[e>>2]=c[x>>2];c[e+(b<<2)>>2]=q;q=c[z+(v+24)>>2]|0;c[e+(n<<2)>>2]=c[z+(v+16)>>2];c[e+(o<<2)>>2]=q}else{q=d[z+(v+1)>>0]|0;t=c[g+(r<<6)+4>>2]|0;a[e>>0]=a[3472+(p+512+(d[x>>0]|0))>>0]|0;x=d[z+(v+2)>>0]|0;p=c[g+(r<<6)+8>>2]|0;a[m+(w+1)>>0]=a[3472+((q|512)+t)>>0]|0;t=d[z+(v+3)>>0]|0;q=c[g+(r<<6)+12>>2]|0;a[m+(w+2)>>0]=a[3472+(p+512+x)>>0]|0;a[m+(w+3)>>0]=a[3472+(q+512+t)>>0]|0;t=w+k|0;w=d[z+(v+9)>>0]|0;q=c[g+(r<<6)+20>>2]|0;a[m+t>>0]=a[3472+((c[g+(r<<6)+16>>2]|0)+512+(d[z+(v+8)>>0]|0))>>0]|0;x=d[z+(v+10)>>0]|0;p=c[g+(r<<6)+24>>2]|0;a[m+(t+1)>>0]=a[3472+((w|512)+q)>>0]|0;q=d[z+(v+11)>>0]|0;w=c[g+(r<<6)+28>>2]|0;a[m+(t+2)>>0]=a[3472+(p+512+x)>>0]|0;a[m+(t+3)>>0]=a[3472+(w+512+q)>>0]|0;q=t+k|0;t=d[z+(v+17)>>0]|0;w=c[g+(r<<6)+36>>2]|0;a[m+q>>0]=a[3472+((c[g+(r<<6)+32>>2]|0)+512+(d[z+(v+16)>>0]|0))>>0]|0;x=d[z+(v+18)>>0]|0;p=c[g+(r<<6)+40>>2]|0;a[m+(q+1)>>0]=a[3472+((t|512)+w)>>0]|0;w=d[z+(v+19)>>0]|0;t=c[g+(r<<6)+44>>2]|0;a[m+(q+2)>>0]=a[3472+(p+512+x)>>0]|0;a[m+(q+3)>>0]=a[3472+(t+512+w)>>0]|0;w=q+k|0;q=d[z+(v+25)>>0]|0;t=c[g+(r<<6)+52>>2]|0;a[m+w>>0]=a[3472+((c[g+(r<<6)+48>>2]|0)+512+(d[z+(v+24)>>0]|0))>>0]|0;x=d[z+(v+26)>>0]|0;p=c[g+(r<<6)+56>>2]|0;a[m+(w+1)>>0]=a[3472+((q|512)+t)>>0]|0;t=d[z+(v+27)>>0]|0;v=c[g+(r<<6)+60>>2]|0;a[m+(w+2)>>0]=a[3472+(p+512+x)>>0]|0;a[m+(w+3)>>0]=a[3472+(v+512+t)>>0]|0}r=r+1|0}while((r|0)!=24);i=h;return}function xc(e,f){e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0,qc=0,rc=0,sc=0,tc=0,uc=0,vc=0,wc=0,xc=0,Ec=0,Fc=0,Gc=0,Hc=0,Ic=0,Jc=0,Kc=0,Lc=0,Mc=0,Nc=0,Oc=0,Pc=0,Qc=0,Rc=0,Sc=0;g=i;i=i+176|0;h=g+40|0;j=g;k=c[e+4>>2]|0;l=e+8|0;m=c[l>>2]|0;n=Z(m,k)|0;if(!m){i=g;return}m=h+24|0;o=h+16|0;p=h+8|0;q=h+100|0;r=h+68|0;s=h+36|0;t=h+4|0;u=h+120|0;v=h+112|0;w=h+104|0;x=h+96|0;y=h+88|0;z=h+80|0;A=h+72|0;B=h+64|0;C=h+56|0;D=h+48|0;E=h+40|0;F=h+32|0;G=h+124|0;H=h+116|0;I=h+108|0;J=h+92|0;K=h+84|0;L=h+76|0;M=h+60|0;N=h+52|0;O=h+44|0;P=h+28|0;Q=h+20|0;R=h+12|0;S=j+28|0;T=j+32|0;U=j+24|0;V=k<<4;W=0-V|0;X=W<<1;Y=Z(k,-48)|0;_=k<<5;$=W<<2;aa=k*48|0;ba=k<<6;ca=j+24|0;da=j+12|0;ea=n<<8;fa=n<<6;n=k<<3;ga=V|4;ha=j+16|0;ia=j+20|0;ja=j+12|0;ka=j+4|0;la=j+8|0;ma=0;na=0;oa=f;while(1){f=c[oa+8>>2]|0;do if((f|0)!=1){pa=oa+200|0;qa=c[pa>>2]|0;do if(!qa)ra=1;else{if((f|0)==2?(c[oa+4>>2]|0)!=(c[qa+4>>2]|0):0){ra=1;break}ra=5}while(0);sa=oa+204|0;ta=c[sa>>2]|0;do if(!ta)ua=ra;else{if((f|0)==2?(c[oa+4>>2]|0)!=(c[ta+4>>2]|0):0){ua=ra;break}ua=ra|2}while(0);va=(ua&2|0)==0;do if(va){c[m>>2]=0;c[o>>2]=0;c[p>>2]=0;c[h>>2]=0;wa=0}else{if((c[oa>>2]|0)>>>0<=5?(c[ta>>2]|0)>>>0<=5:0){if((b[oa+28>>1]|0)==0?(b[ta+48>>1]|0)==0:0)if((c[oa+116>>2]|0)==(c[ta+124>>2]|0)?(xa=(b[oa+132>>1]|0)-(b[ta+172>>1]|0)|0,(((xa|0)>-1?xa:0-xa|0)|0)<=3):0){xa=(b[oa+134>>1]|0)-(b[ta+174>>1]|0)|0;ya=(((xa|0)>-1?xa:0-xa|0)|0)>3&1}else ya=1;else ya=2;c[h>>2]=ya;if((b[oa+30>>1]|0)==0?(b[ta+50>>1]|0)==0:0)if((c[oa+116>>2]|0)==(c[ta+124>>2]|0)?(xa=(b[oa+136>>1]|0)-(b[ta+176>>1]|0)|0,(((xa|0)>-1?xa:0-xa|0)|0)<=3):0){xa=(b[oa+138>>1]|0)-(b[ta+178>>1]|0)|0;za=(((xa|0)>-1?xa:0-xa|0)|0)>3&1}else za=1;else za=2;c[p>>2]=za;if((b[oa+36>>1]|0)==0?(b[ta+56>>1]|0)==0:0)if((c[oa+120>>2]|0)==(c[ta+128>>2]|0)?(xa=(b[oa+148>>1]|0)-(b[ta+188>>1]|0)|0,(((xa|0)>-1?xa:0-xa|0)|0)<=3):0){xa=(b[oa+150>>1]|0)-(b[ta+190>>1]|0)|0;Aa=(((xa|0)>-1?xa:0-xa|0)|0)>3&1}else Aa=1;else Aa=2;c[o>>2]=Aa;if((b[oa+38>>1]|0)==0?(b[ta+58>>1]|0)==0:0)if((c[oa+120>>2]|0)==(c[ta+128>>2]|0)?(xa=(b[oa+152>>1]|0)-(b[ta+192>>1]|0)|0,(((xa|0)>-1?xa:0-xa|0)|0)<=3):0){xa=(b[oa+154>>1]|0)-(b[ta+194>>1]|0)|0;Ba=(((xa|0)>-1?xa:0-xa|0)|0)>3&1}else Ba=1;else Ba=2;c[m>>2]=Ba;wa=(za|ya|Aa|Ba|0)!=0&1;break}c[m>>2]=4;c[o>>2]=4;c[p>>2]=4;c[h>>2]=4;wa=1}while(0);ta=(ua&4|0)==0;do if(ta){c[q>>2]=0;c[r>>2]=0;c[s>>2]=0;c[t>>2]=0;Ca=c[oa>>2]|0;Da=wa}else{xa=c[oa>>2]|0;if(xa>>>0<=5?(c[qa>>2]|0)>>>0<=5:0){if((b[oa+28>>1]|0)==0?(b[qa+38>>1]|0)==0:0)if((c[oa+116>>2]|0)==(c[qa+120>>2]|0)?(Ea=(b[oa+132>>1]|0)-(b[qa+152>>1]|0)|0,(((Ea|0)>-1?Ea:0-Ea|0)|0)<=3):0){Ea=(b[oa+134>>1]|0)-(b[qa+154>>1]|0)|0;Fa=(((Ea|0)>-1?Ea:0-Ea|0)|0)>3&1}else Fa=1;else Fa=2;c[t>>2]=Fa;if((b[oa+32>>1]|0)==0?(b[qa+42>>1]|0)==0:0)if((c[oa+116>>2]|0)==(c[qa+120>>2]|0)?(Ea=(b[oa+140>>1]|0)-(b[qa+160>>1]|0)|0,(((Ea|0)>-1?Ea:0-Ea|0)|0)<=3):0){Ea=(b[oa+142>>1]|0)-(b[qa+162>>1]|0)|0;Ga=(((Ea|0)>-1?Ea:0-Ea|0)|0)>3&1}else Ga=1;else Ga=2;c[s>>2]=Ga;if((b[oa+44>>1]|0)==0?(b[qa+54>>1]|0)==0:0)if((c[oa+124>>2]|0)==(c[qa+128>>2]|0)?(Ea=(b[oa+164>>1]|0)-(b[qa+184>>1]|0)|0,(((Ea|0)>-1?Ea:0-Ea|0)|0)<=3):0){Ea=(b[oa+166>>1]|0)-(b[qa+186>>1]|0)|0;Ha=(((Ea|0)>-1?Ea:0-Ea|0)|0)>3&1}else Ha=1;else Ha=2;c[r>>2]=Ha;if((b[oa+48>>1]|0)==0?(b[qa+58>>1]|0)==0:0)if((c[oa+124>>2]|0)==(c[qa+128>>2]|0)?(Ea=(b[oa+172>>1]|0)-(b[qa+192>>1]|0)|0,(((Ea|0)>-1?Ea:0-Ea|0)|0)<=3):0){Ea=(b[oa+174>>1]|0)-(b[qa+194>>1]|0)|0;Ia=(((Ea|0)>-1?Ea:0-Ea|0)|0)>3&1}else Ia=1;else Ia=2;c[q>>2]=Ia;if(wa){Ca=xa;Da=wa;break}Ca=xa;Da=(Ga|Fa|Ha|Ia|0)!=0&1;break}c[q>>2]=4;c[r>>2]=4;c[s>>2]=4;c[t>>2]=4;Ca=xa;Da=1}while(0);if(Ca>>>0<=5){do if((db(Ca)|0)!=1){qa=c[oa>>2]|0;if((qa|0)==3){xa=oa+28|0;Ea=b[oa+32>>1]|0;if(!(Ea<<16>>16))Ja=(b[xa>>1]|0)!=0?2:0;else Ja=2;c[F>>2]=Ja;Ka=b[oa+34>>1]|0;La=Ka<<16>>16==0;if(La)Ma=(b[oa+30>>1]|0)!=0?2:0;else Ma=2;c[E>>2]=Ma;Na=b[oa+40>>1]|0;if(!(Na<<16>>16))Pa=(b[oa+36>>1]|0)!=0?2:0;else Pa=2;c[D>>2]=Pa;Qa=b[oa+42>>1]|0;Ra=Qa<<16>>16==0;if(Ra)Sa=(b[oa+38>>1]|0)!=0?2:0;else Sa=2;c[C>>2]=Sa;Ta=b[oa+44>>1]|0;if(!(Ta<<16>>16))Ua=Ea<<16>>16!=0?2:0;else Ua=2;c[B>>2]=Ua;Va=b[oa+46>>1]|0;Wa=Va<<16>>16==0;if(Wa)Xa=Ka<<16>>16!=0?2:0;else Xa=2;c[A>>2]=Xa;Ya=b[oa+52>>1]|0;if(!(Ya<<16>>16))Za=Na<<16>>16!=0?2:0;else Za=2;c[z>>2]=Za;_a=b[oa+54>>1]|0;$a=_a<<16>>16==0;if($a)ab=Qa<<16>>16!=0?2:0;else ab=2;c[y>>2]=ab;Qa=b[oa+48>>1]|0;if(!(Qa<<16>>16))bb=Ta<<16>>16!=0?2:0;else bb=2;c[x>>2]=bb;cb=b[oa+50>>1]|0;eb=cb<<16>>16==0;if(eb)fb=Va<<16>>16!=0?2:0;else fb=2;c[w>>2]=fb;gb=b[oa+56>>1]|0;if(!(gb<<16>>16))hb=Ya<<16>>16!=0?2:0;else hb=2;c[v>>2]=hb;ib=(b[oa+58>>1]|0)==0;if(ib)jb=_a<<16>>16!=0?2:0;else jb=2;c[u>>2]=jb;_a=b[oa+30>>1]|0;if(!(_a<<16>>16))kb=(b[xa>>1]|0)!=0?2:0;else kb=2;c[R>>2]=kb;if(!(b[oa+38>>1]|0))lb=(b[oa+36>>1]|0)!=0?2:0;else lb=2;c[P>>2]=lb;if(La)mb=Ea<<16>>16!=0?2:0;else mb=2;c[O>>2]=mb;if(Ra)nb=Na<<16>>16!=0?2:0;else nb=2;c[M>>2]=nb;if(Wa)ob=Ta<<16>>16!=0?2:0;else ob=2;c[L>>2]=ob;if($a)pb=Ya<<16>>16!=0?2:0;else pb=2;c[J>>2]=pb;if(eb)qb=Qa<<16>>16!=0?2:0;else qb=2;c[I>>2]=qb;if(ib)rb=gb<<16>>16!=0?2:0;else rb=2;c[G>>2]=rb;ib=b[oa+150>>1]|0;Qa=b[oa+138>>1]|0;do if(!((b[oa+36>>1]|_a)<<16>>16)){eb=(b[oa+148>>1]|0)-(b[oa+136>>1]|0)|0;if((((eb|0)>-1?eb:0-eb|0)|0)>3){sb=1;break}eb=ib-Qa|0;if((((eb|0)>-1?eb:0-eb|0)|0)>3){sb=1;break}sb=(c[oa+120>>2]|0)!=(c[oa+116>>2]|0)&1}else sb=2;while(0);c[Q>>2]=sb;Qa=b[oa+158>>1]|0;ib=b[oa+146>>1]|0;do if(!((Na|Ka)<<16>>16)){_a=(b[oa+156>>1]|0)-(b[oa+144>>1]|0)|0;if((((_a|0)>-1?_a:0-_a|0)|0)>3){tb=1;break}_a=Qa-ib|0;if((((_a|0)>-1?_a:0-_a|0)|0)>3){tb=1;break}tb=(c[oa+120>>2]|0)!=(c[oa+116>>2]|0)&1}else tb=2;while(0);c[N>>2]=tb;ib=b[oa+182>>1]|0;Qa=b[oa+170>>1]|0;do if(!((Ya|Va)<<16>>16)){Ka=(b[oa+180>>1]|0)-(b[oa+168>>1]|0)|0;if((((Ka|0)>-1?Ka:0-Ka|0)|0)>3){ub=1;break}Ka=ib-Qa|0;if((((Ka|0)>-1?Ka:0-Ka|0)|0)>3){ub=1;break}ub=(c[oa+128>>2]|0)!=(c[oa+124>>2]|0)&1}else ub=2;while(0);c[K>>2]=ub;Qa=b[oa+190>>1]|0;ib=b[oa+178>>1]|0;do if(!((gb|cb)<<16>>16)){Va=(b[oa+188>>1]|0)-(b[oa+176>>1]|0)|0;if((((Va|0)>-1?Va:0-Va|0)|0)>3){vb=1;break}Va=Qa-ib|0;if((((Va|0)>-1?Va:0-Va|0)|0)>3){vb=1;break}vb=(c[oa+128>>2]|0)!=(c[oa+124>>2]|0)&1}else vb=2;while(0);c[H>>2]=vb;break}else if((qa|0)==2){ib=oa+28|0;Qa=b[oa+32>>1]|0;if(!(Qa<<16>>16))wb=(b[ib>>1]|0)!=0?2:0;else wb=2;c[F>>2]=wb;cb=b[oa+34>>1]|0;gb=cb<<16>>16==0;if(gb)xb=(b[oa+30>>1]|0)!=0?2:0;else xb=2;c[E>>2]=xb;Va=b[oa+40>>1]|0;Ya=Va<<16>>16==0;if(Ya)yb=(b[oa+36>>1]|0)!=0?2:0;else yb=2;c[D>>2]=yb;Ka=b[oa+42>>1]|0;Na=Ka<<16>>16==0;if(Na)zb=(b[oa+38>>1]|0)!=0?2:0;else zb=2;c[C>>2]=zb;_a=b[oa+48>>1]|0;if(!(_a<<16>>16))Ab=(b[oa+44>>1]|0)!=0?2:0;else Ab=2;c[x>>2]=Ab;eb=b[oa+50>>1]|0;$a=eb<<16>>16==0;if($a)Bb=(b[oa+46>>1]|0)!=0?2:0;else Bb=2;c[w>>2]=Bb;Ta=b[oa+56>>1]|0;Wa=Ta<<16>>16==0;if(Wa)Cb=(b[oa+52>>1]|0)!=0?2:0;else Cb=2;c[v>>2]=Cb;Ra=(b[oa+58>>1]|0)==0;if(Ra)Db=(b[oa+54>>1]|0)!=0?2:0;else Db=2;c[u>>2]=Db;Ea=b[oa+44>>1]|0;La=b[oa+166>>1]|0;xa=b[oa+142>>1]|0;do if(!((Ea|Qa)<<16>>16)){Eb=(b[oa+164>>1]|0)-(b[oa+140>>1]|0)|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Fb=1;break}Eb=La-xa|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Fb=1;break}Fb=(c[oa+124>>2]|0)!=(c[oa+116>>2]|0)&1}else Fb=2;while(0);c[B>>2]=Fb;xa=b[oa+46>>1]|0;La=b[oa+170>>1]|0;qa=b[oa+146>>1]|0;do if(!((xa|cb)<<16>>16)){Eb=(b[oa+168>>1]|0)-(b[oa+144>>1]|0)|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Gb=1;break}Eb=La-qa|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Gb=1;break}Gb=(c[oa+124>>2]|0)!=(c[oa+116>>2]|0)&1}else Gb=2;while(0);c[A>>2]=Gb;qa=b[oa+52>>1]|0;La=b[oa+182>>1]|0;Eb=b[oa+158>>1]|0;do if(!((qa|Va)<<16>>16)){Hb=(b[oa+180>>1]|0)-(b[oa+156>>1]|0)|0;if((((Hb|0)>-1?Hb:0-Hb|0)|0)>3){Ib=1;break}Hb=La-Eb|0;if((((Hb|0)>-1?Hb:0-Hb|0)|0)>3){Ib=1;break}Ib=(c[oa+128>>2]|0)!=(c[oa+120>>2]|0)&1}else Ib=2;while(0);c[z>>2]=Ib;Eb=b[oa+54>>1]|0;La=b[oa+186>>1]|0;Hb=b[oa+162>>1]|0;do if(!((Eb|Ka)<<16>>16)){Jb=(b[oa+184>>1]|0)-(b[oa+160>>1]|0)|0;if((((Jb|0)>-1?Jb:0-Jb|0)|0)>3){Kb=1;break}Jb=La-Hb|0;if((((Jb|0)>-1?Jb:0-Jb|0)|0)>3){Kb=1;break}Kb=(c[oa+128>>2]|0)!=(c[oa+120>>2]|0)&1}else Kb=2;while(0);c[y>>2]=Kb;Hb=b[oa+30>>1]|0;if(!(Hb<<16>>16))Lb=(b[ib>>1]|0)!=0?2:0;else Lb=2;c[R>>2]=Lb;La=b[oa+36>>1]|0;if(!(La<<16>>16))Mb=Hb<<16>>16!=0?2:0;else Mb=2;c[Q>>2]=Mb;if(!(b[oa+38>>1]|0))Nb=La<<16>>16!=0?2:0;else Nb=2;c[P>>2]=Nb;if(gb)Ob=Qa<<16>>16!=0?2:0;else Ob=2;c[O>>2]=Ob;if(Ya)Pb=cb<<16>>16!=0?2:0;else Pb=2;c[N>>2]=Pb;if(Na)Qb=Va<<16>>16!=0?2:0;else Qb=2;c[M>>2]=Qb;if(!(xa<<16>>16))Rb=Ea<<16>>16!=0?2:0;else Rb=2;c[L>>2]=Rb;if(!(qa<<16>>16))Sb=xa<<16>>16!=0?2:0;else Sb=2;c[K>>2]=Sb;if(!(Eb<<16>>16))Tb=qa<<16>>16!=0?2:0;else Tb=2;c[J>>2]=Tb;if($a)Ub=_a<<16>>16!=0?2:0;else Ub=2;c[I>>2]=Ub;if(Wa)Vb=eb<<16>>16!=0?2:0;else Vb=2;c[H>>2]=Vb;if(Ra)Wb=Ta<<16>>16!=0?2:0;else Wb=2;c[G>>2]=Wb;break}else{La=b[oa+32>>1]|0;Hb=b[oa+28>>1]|0;Ka=b[oa+142>>1]|0;Jb=b[oa+134>>1]|0;if(!((Hb|La)<<16>>16)){Xb=(b[oa+140>>1]|0)-(b[oa+132>>1]|0)|0;if((((Xb|0)>-1?Xb:0-Xb|0)|0)>3)Yb=1;else{Xb=Ka-Jb|0;Yb=(((Xb|0)>-1?Xb:0-Xb|0)|0)>3&1}}else Yb=2;c[F>>2]=Yb;Xb=b[oa+34>>1]|0;Zb=b[oa+30>>1]|0;_b=b[oa+146>>1]|0;$b=b[oa+138>>1]|0;if(!((Zb|Xb)<<16>>16)){ac=(b[oa+144>>1]|0)-(b[oa+136>>1]|0)|0;if((((ac|0)>-1?ac:0-ac|0)|0)>3)bc=1;else{ac=_b-$b|0;bc=(((ac|0)>-1?ac:0-ac|0)|0)>3&1}}else bc=2;c[E>>2]=bc;ac=b[oa+40>>1]|0;cc=b[oa+36>>1]|0;dc=b[oa+158>>1]|0;ec=b[oa+150>>1]|0;if(!((cc|ac)<<16>>16)){fc=(b[oa+156>>1]|0)-(b[oa+148>>1]|0)|0;if((((fc|0)>-1?fc:0-fc|0)|0)>3)gc=1;else{fc=dc-ec|0;gc=(((fc|0)>-1?fc:0-fc|0)|0)>3&1}}else gc=2;c[D>>2]=gc;fc=b[oa+42>>1]|0;hc=b[oa+38>>1]|0;ic=b[oa+162>>1]|0;jc=b[oa+154>>1]|0;if(!((hc|fc)<<16>>16)){kc=(b[oa+160>>1]|0)-(b[oa+152>>1]|0)|0;if((((kc|0)>-1?kc:0-kc|0)|0)>3)lc=1;else{kc=ic-jc|0;lc=(((kc|0)>-1?kc:0-kc|0)|0)>3&1}}else lc=2;c[C>>2]=lc;kc=b[oa+44>>1]|0;mc=b[oa+166>>1]|0;do if(!((kc|La)<<16>>16)){nc=(b[oa+164>>1]|0)-(b[oa+140>>1]|0)|0;if((((nc|0)>-1?nc:0-nc|0)|0)>3)oc=1;else{nc=mc-Ka|0;if((((nc|0)>-1?nc:0-nc|0)|0)>3){oc=1;break}oc=(c[oa+124>>2]|0)!=(c[oa+116>>2]|0)&1}}else oc=2;while(0);c[B>>2]=oc;Ta=b[oa+46>>1]|0;Ra=b[oa+170>>1]|0;do if(!((Ta|Xb)<<16>>16)){eb=(b[oa+168>>1]|0)-(b[oa+144>>1]|0)|0;if((((eb|0)>-1?eb:0-eb|0)|0)>3){pc=1;break}eb=Ra-_b|0;if((((eb|0)>-1?eb:0-eb|0)|0)>3){pc=1;break}pc=(c[oa+124>>2]|0)!=(c[oa+116>>2]|0)&1}else pc=2;while(0);c[A>>2]=pc;eb=b[oa+52>>1]|0;Wa=b[oa+182>>1]|0;do if(!((eb|ac)<<16>>16)){_a=(b[oa+180>>1]|0)-(b[oa+156>>1]|0)|0;if((((_a|0)>-1?_a:0-_a|0)|0)>3){qc=1;break}_a=Wa-dc|0;if((((_a|0)>-1?_a:0-_a|0)|0)>3){qc=1;break}qc=(c[oa+128>>2]|0)!=(c[oa+120>>2]|0)&1}else qc=2;while(0);c[z>>2]=qc;_a=b[oa+54>>1]|0;$a=b[oa+186>>1]|0;do if(!((_a|fc)<<16>>16)){qa=(b[oa+184>>1]|0)-(b[oa+160>>1]|0)|0;if((((qa|0)>-1?qa:0-qa|0)|0)>3){rc=1;break}qa=$a-ic|0;if((((qa|0)>-1?qa:0-qa|0)|0)>3){rc=1;break}rc=(c[oa+128>>2]|0)!=(c[oa+120>>2]|0)&1}else rc=2;while(0);c[y>>2]=rc;qa=b[oa+48>>1]|0;Eb=b[oa+174>>1]|0;do if(!((qa|kc)<<16>>16)){xa=(b[oa+172>>1]|0)-(b[oa+164>>1]|0)|0;if((((xa|0)>-1?xa:0-xa|0)|0)>3){sc=1;break}xa=Eb-mc|0;sc=(((xa|0)>-1?xa:0-xa|0)|0)>3&1}else sc=2;while(0);c[x>>2]=sc;xa=b[oa+50>>1]|0;Ea=b[oa+178>>1]|0;do if(!((xa|Ta)<<16>>16)){Va=(b[oa+176>>1]|0)-(b[oa+168>>1]|0)|0;if((((Va|0)>-1?Va:0-Va|0)|0)>3){tc=1;break}Va=Ea-Ra|0;tc=(((Va|0)>-1?Va:0-Va|0)|0)>3&1}else tc=2;while(0);c[w>>2]=tc;Va=b[oa+56>>1]|0;Na=b[oa+190>>1]|0;do if(!((Va|eb)<<16>>16)){cb=(b[oa+188>>1]|0)-(b[oa+180>>1]|0)|0;if((((cb|0)>-1?cb:0-cb|0)|0)>3){uc=1;break}cb=Na-Wa|0;uc=(((cb|0)>-1?cb:0-cb|0)|0)>3&1}else uc=2;while(0);c[v>>2]=uc;cb=b[oa+58>>1]|0;Ya=b[oa+194>>1]|0;do if(!((cb|_a)<<16>>16)){Qa=(b[oa+192>>1]|0)-(b[oa+184>>1]|0)|0;if((((Qa|0)>-1?Qa:0-Qa|0)|0)>3){vc=1;break}Qa=Ya-$a|0;vc=(((Qa|0)>-1?Qa:0-Qa|0)|0)>3&1}else vc=2;while(0);c[u>>2]=vc;do if(!((Zb|Hb)<<16>>16)){Qa=(b[oa+136>>1]|0)-(b[oa+132>>1]|0)|0;if((((Qa|0)>-1?Qa:0-Qa|0)|0)>3){wc=1;break}Qa=$b-Jb|0;wc=(((Qa|0)>-1?Qa:0-Qa|0)|0)>3&1}else wc=2;while(0);c[R>>2]=wc;do if(!((cc|Zb)<<16>>16)){Jb=(b[oa+148>>1]|0)-(b[oa+136>>1]|0)|0;if((((Jb|0)>-1?Jb:0-Jb|0)|0)>3){xc=1;break}Jb=ec-$b|0;if((((Jb|0)>-1?Jb:0-Jb|0)|0)>3){xc=1;break}xc=(c[oa+120>>2]|0)!=(c[oa+116>>2]|0)&1}else xc=2;while(0);c[Q>>2]=xc;do if(!((hc|cc)<<16>>16)){$b=(b[oa+152>>1]|0)-(b[oa+148>>1]|0)|0;if(((($b|0)>-1?$b:0-$b|0)|0)>3){Ec=1;break}$b=jc-ec|0;Ec=((($b|0)>-1?$b:0-$b|0)|0)>3&1}else Ec=2;while(0);c[P>>2]=Ec;do if(!((Xb|La)<<16>>16)){ec=(b[oa+144>>1]|0)-(b[oa+140>>1]|0)|0;if((((ec|0)>-1?ec:0-ec|0)|0)>3){Fc=1;break}ec=_b-Ka|0;Fc=(((ec|0)>-1?ec:0-ec|0)|0)>3&1}else Fc=2;while(0);c[O>>2]=Fc;do if(!((ac|Xb)<<16>>16)){Ka=(b[oa+156>>1]|0)-(b[oa+144>>1]|0)|0;if((((Ka|0)>-1?Ka:0-Ka|0)|0)>3){Gc=1;break}Ka=dc-_b|0;if((((Ka|0)>-1?Ka:0-Ka|0)|0)>3){Gc=1;break}Gc=(c[oa+120>>2]|0)!=(c[oa+116>>2]|0)&1}else Gc=2;while(0);c[N>>2]=Gc;do if(!((fc|ac)<<16>>16)){_b=(b[oa+160>>1]|0)-(b[oa+156>>1]|0)|0;if((((_b|0)>-1?_b:0-_b|0)|0)>3){Hc=1;break}_b=ic-dc|0;Hc=(((_b|0)>-1?_b:0-_b|0)|0)>3&1}else Hc=2;while(0);c[M>>2]=Hc;do if(!((Ta|kc)<<16>>16)){dc=(b[oa+168>>1]|0)-(b[oa+164>>1]|0)|0;if((((dc|0)>-1?dc:0-dc|0)|0)>3){Ic=1;break}dc=Ra-mc|0;Ic=(((dc|0)>-1?dc:0-dc|0)|0)>3&1}else Ic=2;while(0);c[L>>2]=Ic;do if(!((eb|Ta)<<16>>16)){mc=(b[oa+180>>1]|0)-(b[oa+168>>1]|0)|0;if((((mc|0)>-1?mc:0-mc|0)|0)>3){Jc=1;break}mc=Wa-Ra|0;if((((mc|0)>-1?mc:0-mc|0)|0)>3){Jc=1;break}Jc=(c[oa+128>>2]|0)!=(c[oa+124>>2]|0)&1}else Jc=2;while(0);c[K>>2]=Jc;do if(!((_a|eb)<<16>>16)){Ra=(b[oa+184>>1]|0)-(b[oa+180>>1]|0)|0;if((((Ra|0)>-1?Ra:0-Ra|0)|0)>3){Kc=1;break}Ra=$a-Wa|0;Kc=(((Ra|0)>-1?Ra:0-Ra|0)|0)>3&1}else Kc=2;while(0);c[J>>2]=Kc;do if(!((xa|qa)<<16>>16)){Wa=(b[oa+176>>1]|0)-(b[oa+172>>1]|0)|0;if((((Wa|0)>-1?Wa:0-Wa|0)|0)>3){Lc=1;break}Wa=Ea-Eb|0;Lc=(((Wa|0)>-1?Wa:0-Wa|0)|0)>3&1}else Lc=2;while(0);c[I>>2]=Lc;do if(!((Va|xa)<<16>>16)){Eb=(b[oa+188>>1]|0)-(b[oa+176>>1]|0)|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Mc=1;break}Eb=Na-Ea|0;if((((Eb|0)>-1?Eb:0-Eb|0)|0)>3){Mc=1;break}Mc=(c[oa+128>>2]|0)!=(c[oa+124>>2]|0)&1}else Mc=2;while(0);c[H>>2]=Mc;do if(!((cb|Va)<<16>>16)){Ea=(b[oa+192>>1]|0)-(b[oa+188>>1]|0)|0;if((((Ea|0)>-1?Ea:0-Ea|0)|0)>3){Nc=1;break}Ea=Ya-Na|0;Nc=(((Ea|0)>-1?Ea:0-Ea|0)|0)>3&1}else Nc=2;while(0);c[G>>2]=Nc;break}}else yc(oa,h);while(0);if(!(Da|c[F>>2]|c[E>>2]|c[D>>2]|c[C>>2]|c[B>>2]|c[A>>2]|c[z>>2]|c[y>>2]|c[x>>2]|c[w>>2]|c[v>>2]|c[u>>2]|c[R>>2]|c[Q>>2]|c[P>>2]|c[O>>2]|c[N>>2]|c[M>>2]|c[L>>2]|c[K>>2]|c[J>>2]|c[I>>2]|c[H>>2]|c[G>>2]))break}else{c[u>>2]=3;c[v>>2]=3;c[w>>2]=3;c[x>>2]=3;c[y>>2]=3;c[z>>2]=3;c[A>>2]=3;c[B>>2]=3;c[C>>2]=3;c[D>>2]=3;c[E>>2]=3;c[F>>2]=3;c[G>>2]=3;c[H>>2]=3;c[I>>2]=3;c[J>>2]=3;c[K>>2]=3;c[L>>2]=3;c[M>>2]=3;c[N>>2]=3;c[O>>2]=3;c[P>>2]=3;c[Q>>2]=3;c[R>>2]=3}Na=oa+20|0;Ya=c[Na>>2]|0;Va=oa+12|0;cb=Oa(0,51,(c[Va>>2]|0)+Ya|0)|0;Ea=oa+16|0;xa=Oa(0,51,(c[Ea>>2]|0)+Ya|0)|0;Eb=d[6864+cb>>0]|0;c[S>>2]=Eb;qa=d[6920+xa>>0]|0;c[T>>2]=qa;xa=6976+(cb*3|0)|0;c[U>>2]=xa;do if(!va){cb=c[(c[sa>>2]|0)+20>>2]|0;if((cb|0)==(Ya|0)){c[ka>>2]=Eb;c[la>>2]=qa;c[j>>2]=xa;break}else{Wa=(Ya+1+cb|0)>>>1;cb=Oa(0,51,(c[Va>>2]|0)+Wa|0)|0;$a=Oa(0,51,(c[Ea>>2]|0)+Wa|0)|0;c[ka>>2]=d[6864+cb>>0];c[la>>2]=d[6920+$a>>0];c[j>>2]=6976+(cb*3|0);break}}while(0);do if(!ta){xa=c[(c[pa>>2]|0)+20>>2]|0;if((xa|0)==(Ya|0)){c[ha>>2]=c[S>>2];c[ia>>2]=c[T>>2];c[ja>>2]=c[U>>2];break}else{qa=(Ya+1+xa|0)>>>1;xa=Oa(0,51,(c[Va>>2]|0)+qa|0)|0;Eb=Oa(0,51,(c[Ea>>2]|0)+qa|0)|0;c[ha>>2]=d[6864+xa>>0];c[ia>>2]=d[6920+Eb>>0];c[ja>>2]=6976+(xa*3|0);break}}while(0);Ya=Z(na,k)|0;xa=3;Eb=0;qa=(c[e>>2]|0)+((Ya<<8)+(ma<<4))|0;cb=h;while(1){$a=c[cb+4>>2]|0;if($a)zc(qa,$a,da,V);$a=c[cb+12>>2]|0;if($a)zc(qa+4|0,$a,ca,V);$a=cb+16|0;Wa=c[cb+20>>2]|0;if(Wa)zc(qa+8|0,Wa,ca,V);Wa=cb+24|0;eb=c[cb+28>>2]|0;if(eb)zc(qa+12|0,eb,ca,V);eb=c[cb>>2]|0;_a=cb+8|0;Ra=c[_a>>2]|0;a:do if(((eb|0)==(Ra|0)?(eb|0)==(c[$a>>2]|0):0)?(eb|0)==(c[Wa>>2]|0):0){if(!eb)break;Ta=c[j+(Eb*12|0)+4>>2]|0;mc=c[j+(Eb*12|0)+8>>2]|0;if(eb>>>0<4){kc=d[(c[j+(Eb*12|0)>>2]|0)+(eb+-1)>>0]|0;dc=0-kc|0;ic=kc+1|0;ac=qa;fc=16;while(1){_b=ac+X|0;Xb=d[_b>>0]|0;Ka=ac+W|0;La=d[Ka>>0]|0;ec=d[ac>>0]|0;jc=ac+V|0;cc=d[jc>>0]|0;hc=La-ec|0;do if(((hc|0)>-1?hc:0-hc|0)>>>0<Ta>>>0){$b=Xb-La|0;if((($b|0)>-1?$b:0-$b|0)>>>0>=mc>>>0)break;$b=cc-ec|0;if((($b|0)>-1?$b:0-$b|0)>>>0>=mc>>>0)break;$b=d[ac+Y>>0]|0;Zb=$b-La|0;if(((Zb|0)>-1?Zb:0-Zb|0)>>>0<mc>>>0){a[_b>>0]=(Oa(dc,kc,((La+1+ec|0)>>>1)-(Xb<<1)+$b>>1)|0)+Xb;Oc=ic}else Oc=kc;$b=d[ac+_>>0]|0;Zb=$b-ec|0;if(((Zb|0)>-1?Zb:0-Zb|0)>>>0<mc>>>0){a[jc>>0]=(Oa(dc,kc,((La+1+ec|0)>>>1)-(cc<<1)+$b>>1)|0)+cc;Pc=Oc+1|0}else Pc=Oc;$b=Oa(0-Pc|0,Pc,Xb+4-cc+(ec-La<<2)>>3)|0;Zb=a[3472+((ec|512)-$b)>>0]|0;a[Ka>>0]=a[3472+($b+(La|512))>>0]|0;a[ac>>0]=Zb}while(0);fc=fc+-1|0;if(!fc)break a;else ac=ac+1|0}}ac=(Ta>>>2)+2|0;fc=qa;kc=16;while(1){dc=fc+X|0;ic=d[dc>>0]|0;La=fc+W|0;Ka=d[La>>0]|0;ec=d[fc>>0]|0;cc=fc+V|0;Xb=d[cc>>0]|0;jc=Ka-ec|0;_b=(jc|0)>-1?jc:0-jc|0;b:do if(_b>>>0<Ta>>>0){jc=ic-Ka|0;if(((jc|0)>-1?jc:0-jc|0)>>>0>=mc>>>0)break;jc=Xb-ec|0;if(((jc|0)>-1?jc:0-jc|0)>>>0>=mc>>>0)break;jc=fc+Y|0;hc=d[jc>>0]|0;Zb=fc+_|0;$b=d[Zb>>0]|0;do if(_b>>>0<ac>>>0){Jb=hc-Ka|0;if(((Jb|0)>-1?Jb:0-Jb|0)>>>0<mc>>>0){Jb=Ka+ic+ec|0;a[La>>0]=(Xb+4+(Jb<<1)+hc|0)>>>3;a[dc>>0]=(Jb+2+hc|0)>>>2;a[jc>>0]=(Jb+4+(hc*3|0)+(d[fc+$>>0]<<1)|0)>>>3}else a[La>>0]=(Ka+2+(ic<<1)+Xb|0)>>>2;Jb=$b-ec|0;if(((Jb|0)>-1?Jb:0-Jb|0)>>>0>=mc>>>0)break;Jb=ec+Ka+Xb|0;a[fc>>0]=(ic+4+(Jb<<1)+$b|0)>>>3;a[cc>>0]=(Jb+2+$b|0)>>>2;a[Zb>>0]=(Jb+4+($b*3|0)+(d[fc+aa>>0]<<1)|0)>>>3;break b}else a[La>>0]=(Ka+2+(ic<<1)+Xb|0)>>>2;while(0);a[fc>>0]=(ic+2+ec+(Xb<<1)|0)>>>2}while(0);kc=kc+-1|0;if(!kc)break;else fc=fc+1|0}}else Qc=311;while(0);do if((Qc|0)==311){Qc=0;if(!eb)Rc=Ra;else{Ac(qa,eb,j+(Eb*12|0)|0,V);Rc=c[_a>>2]|0}if(Rc)Ac(qa+4|0,Rc,j+(Eb*12|0)|0,V);fc=c[$a>>2]|0;if(fc)Ac(qa+8|0,fc,j+(Eb*12|0)|0,V);fc=c[Wa>>2]|0;if(!fc)break;Ac(qa+12|0,fc,j+(Eb*12|0)|0,V)}while(0);if(!xa)break;else{xa=xa+-1|0;Eb=2;qa=qa+ba|0;cb=cb+32|0}}cb=c[oa+24>>2]|0;qa=c[192+((Oa(0,51,(c[Na>>2]|0)+cb|0)|0)<<2)>>2]|0;Eb=Oa(0,51,(c[Va>>2]|0)+qa|0)|0;xa=Oa(0,51,(c[Ea>>2]|0)+qa|0)|0;Wa=d[6864+Eb>>0]|0;c[S>>2]=Wa;$a=d[6920+xa>>0]|0;c[T>>2]=$a;xa=6976+(Eb*3|0)|0;c[U>>2]=xa;do if(!va){Eb=c[(c[sa>>2]|0)+20>>2]|0;if((Eb|0)==(c[Na>>2]|0)){c[ka>>2]=Wa;c[la>>2]=$a;c[j>>2]=xa;break}else{_a=(qa+1+(c[192+((Oa(0,51,Eb+cb|0)|0)<<2)>>2]|0)|0)>>>1;Eb=Oa(0,51,_a+(c[Va>>2]|0)|0)|0;eb=Oa(0,51,(c[Ea>>2]|0)+_a|0)|0;c[ka>>2]=d[6864+Eb>>0];c[la>>2]=d[6920+eb>>0];c[j>>2]=6976+(Eb*3|0);break}}while(0);do if(!ta){xa=c[(c[pa>>2]|0)+20>>2]|0;if((xa|0)==(c[Na>>2]|0)){c[ha>>2]=c[S>>2];c[ia>>2]=c[T>>2];c[ja>>2]=c[U>>2];break}else{$a=(qa+1+(c[192+((Oa(0,51,xa+cb|0)|0)<<2)>>2]|0)|0)>>>1;xa=Oa(0,51,$a+(c[Va>>2]|0)|0)|0;Wa=Oa(0,51,(c[Ea>>2]|0)+$a|0)|0;c[ha>>2]=d[6864+xa>>0];c[ia>>2]=d[6920+Wa>>0];c[ja>>2]=6976+(xa*3|0);break}}while(0);Ea=c[e>>2]|0;Va=(ma<<3)+ea+(Ya<<6)|0;cb=Ea+Va|0;qa=Ea+(Va+fa)|0;Va=0;Ea=h;Na=0;while(1){pa=Ea+4|0;ta=c[pa>>2]|0;if(ta){Bc(cb,ta,da,n);Bc(qa,c[pa>>2]|0,da,n)}pa=Ea+36|0;ta=c[pa>>2]|0;if(ta){Bc(cb+V|0,ta,da,n);Bc(qa+V|0,c[pa>>2]|0,da,n)}pa=Ea+16|0;ta=Ea+20|0;xa=c[ta>>2]|0;if(xa){Bc(cb+4|0,xa,ca,n);Bc(qa+4|0,c[ta>>2]|0,ca,n)}ta=Ea+52|0;xa=c[ta>>2]|0;if(xa){Bc(cb+ga|0,xa,ca,n);Bc(qa+ga|0,c[ta>>2]|0,ca,n)}ta=c[Ea>>2]|0;xa=Ea+8|0;Wa=c[xa>>2]|0;do if((ta|0)==(Wa|0)){if((ta|0)!=(c[pa>>2]|0)){Qc=342;break}if((ta|0)!=(c[Ea+24>>2]|0)){Qc=342;break}if(!ta)break;$a=j+(Va*12|0)|0;Cc(cb,ta,$a,n);Cc(qa,c[Ea>>2]|0,$a,n)}else Qc=342;while(0);do if((Qc|0)==342){Qc=0;if(!ta)Sc=Wa;else{$a=j+(Va*12|0)|0;Dc(cb,ta,$a,n);Dc(qa,c[Ea>>2]|0,$a,n);Sc=c[xa>>2]|0}if(Sc){$a=j+(Va*12|0)|0;Dc(cb+2|0,Sc,$a,n);Dc(qa+2|0,c[xa>>2]|0,$a,n)}$a=c[pa>>2]|0;if($a){sa=j+(Va*12|0)|0;Dc(cb+4|0,$a,sa,n);Dc(qa+4|0,c[pa>>2]|0,sa,n)}sa=Ea+24|0;$a=c[sa>>2]|0;if(!$a)break;va=j+(Va*12|0)|0;Dc(cb+6|0,$a,va,n);Dc(qa+6|0,c[sa>>2]|0,va,n)}while(0);Na=Na+1|0;if((Na|0)==2)break;else{cb=cb+_|0;qa=qa+_|0;Va=2;Ea=Ea+64|0}}}while(0);f=ma+1|0;Ea=(f|0)==(k|0);na=(Ea&1)+na|0;if(na>>>0>=(c[l>>2]|0)>>>0)break;else{ma=Ea?0:f;oa=oa+216|0}}i=g;return}function yc(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;e=i;f=a+28|0;g=b[a+32>>1]|0;if(!(g<<16>>16))h=(b[f>>1]|0)!=0?2:0;else h=2;c[d+32>>2]=h;h=b[a+34>>1]|0;j=h<<16>>16==0;if(j)k=(b[a+30>>1]|0)!=0?2:0;else k=2;c[d+40>>2]=k;k=b[a+40>>1]|0;l=k<<16>>16==0;if(l)m=(b[a+36>>1]|0)!=0?2:0;else m=2;c[d+48>>2]=m;m=b[a+42>>1]|0;n=m<<16>>16==0;if(n)o=(b[a+38>>1]|0)!=0?2:0;else o=2;c[d+56>>2]=o;o=b[a+44>>1]|0;if(!(o<<16>>16))p=g<<16>>16!=0?2:0;else p=2;c[d+64>>2]=p;p=b[a+46>>1]|0;q=p<<16>>16==0;if(q)r=h<<16>>16!=0?2:0;else r=2;c[d+72>>2]=r;r=b[a+52>>1]|0;s=r<<16>>16==0;if(s)t=k<<16>>16!=0?2:0;else t=2;c[d+80>>2]=t;t=b[a+54>>1]|0;u=t<<16>>16==0;if(u)v=m<<16>>16!=0?2:0;else v=2;c[d+88>>2]=v;v=b[a+48>>1]|0;if(!(v<<16>>16))w=o<<16>>16!=0?2:0;else w=2;c[d+96>>2]=w;w=b[a+50>>1]|0;m=w<<16>>16==0;if(m)x=p<<16>>16!=0?2:0;else x=2;c[d+104>>2]=x;x=b[a+56>>1]|0;y=x<<16>>16==0;if(y)z=r<<16>>16!=0?2:0;else z=2;c[d+112>>2]=z;z=(b[a+58>>1]|0)==0;if(z)A=t<<16>>16!=0?2:0;else A=2;c[d+120>>2]=A;A=b[a+30>>1]|0;if(!(A<<16>>16))B=(b[f>>1]|0)!=0?2:0;else B=2;c[d+12>>2]=B;B=b[a+36>>1]|0;if(!(B<<16>>16))C=A<<16>>16!=0?2:0;else C=2;c[d+20>>2]=C;if(!(b[a+38>>1]|0))D=B<<16>>16!=0?2:0;else D=2;c[d+28>>2]=D;if(j)E=g<<16>>16!=0?2:0;else E=2;c[d+44>>2]=E;if(l)F=h<<16>>16!=0?2:0;else F=2;c[d+52>>2]=F;if(n)G=k<<16>>16!=0?2:0;else G=2;c[d+60>>2]=G;if(q)H=o<<16>>16!=0?2:0;else H=2;c[d+76>>2]=H;if(s)I=p<<16>>16!=0?2:0;else I=2;c[d+84>>2]=I;if(u)J=r<<16>>16!=0?2:0;else J=2;c[d+92>>2]=J;if(m)K=v<<16>>16!=0?2:0;else K=2;c[d+108>>2]=K;if(y)L=w<<16>>16!=0?2:0;else L=2;c[d+116>>2]=L;if(!z){M=2;N=d+124|0;c[N>>2]=M;i=e;return}M=x<<16>>16!=0?2:0;N=d+124|0;c[N>>2]=M;i=e;return}function zc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;h=i;j=c[f+4>>2]|0;k=c[f+8>>2]|0;if(e>>>0<4){l=d[(c[f>>2]|0)+(e+-1)>>0]|0;e=0-l|0;f=l+1|0;m=b;n=4;while(1){o=m+-2|0;p=d[o>>0]|0;q=m+-1|0;r=d[q>>0]|0;s=d[m>>0]|0;t=m+1|0;u=d[t>>0]|0;v=r-s|0;if((((v|0)>-1?v:0-v|0)>>>0<j>>>0?(v=p-r|0,((v|0)>-1?v:0-v|0)>>>0<k>>>0):0)?(v=u-s|0,((v|0)>-1?v:0-v|0)>>>0<k>>>0):0){v=d[m+-3>>0]|0;w=d[m+2>>0]|0;x=v-r|0;if(((x|0)>-1?x:0-x|0)>>>0<k>>>0){a[o>>0]=(Oa(e,l,((r+1+s|0)>>>1)-(p<<1)+v>>1)|0)+p;y=f}else y=l;v=w-s|0;if(((v|0)>-1?v:0-v|0)>>>0<k>>>0){a[t>>0]=(Oa(e,l,((r+1+s|0)>>>1)-(u<<1)+w>>1)|0)+u;z=y+1|0}else z=y;w=Oa(0-z|0,z,p+4-u+(s-r<<2)>>3)|0;u=a[3472+((s|512)-w)>>0]|0;a[q>>0]=a[3472+((r|512)+w)>>0]|0;a[m>>0]=u}n=n+-1|0;if(!n)break;else m=m+g|0}i=h;return}m=(j>>>2)+2|0;n=b;b=4;while(1){z=n+-2|0;y=d[z>>0]|0;l=n+-1|0;e=d[l>>0]|0;f=d[n>>0]|0;u=n+1|0;w=d[u>>0]|0;r=e-f|0;q=(r|0)>-1?r:0-r|0;do if((q>>>0<j>>>0?(r=y-e|0,((r|0)>-1?r:0-r|0)>>>0<k>>>0):0)?(r=w-f|0,((r|0)>-1?r:0-r|0)>>>0<k>>>0):0){r=n+-3|0;s=d[r>>0]|0;p=n+2|0;t=d[p>>0]|0;if(q>>>0<m>>>0){v=s-e|0;if(((v|0)>-1?v:0-v|0)>>>0<k>>>0){v=e+y+f|0;a[l>>0]=(w+4+(v<<1)+s|0)>>>3;a[z>>0]=(v+2+s|0)>>>2;a[r>>0]=(v+4+(s*3|0)+((d[n+-4>>0]|0)<<1)|0)>>>3}else a[l>>0]=(e+2+(y<<1)+w|0)>>>2;s=t-f|0;if(((s|0)>-1?s:0-s|0)>>>0<k>>>0){s=f+e+w|0;a[n>>0]=(y+4+(s<<1)+t|0)>>>3;a[u>>0]=(s+2+t|0)>>>2;a[p>>0]=(s+4+(t*3|0)+((d[n+3>>0]|0)<<1)|0)>>>3;break}}else a[l>>0]=(e+2+(y<<1)+w|0)>>>2;a[n>>0]=(y+2+f+(w<<1)|0)>>>2}while(0);b=b+-1|0;if(!b)break;else n=n+g|0}i=h;return}function Ac(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;h=i;j=d[(c[f>>2]|0)+(e+-1)>>0]|0;e=0-g|0;k=e<<1;l=f+4|0;m=f+8|0;f=Z(g,-3)|0;n=0-j|0;o=j+1|0;p=g<<1;q=b;b=4;while(1){r=q+k|0;s=q+e|0;t=q+g|0;u=a[t>>0]|0;v=d[s>>0]|0;w=d[q>>0]|0;x=v-w|0;if((((x|0)>-1?x:0-x|0)>>>0<(c[l>>2]|0)>>>0?(x=d[r>>0]|0,y=x-v|0,z=c[m>>2]|0,((y|0)>-1?y:0-y|0)>>>0<z>>>0):0)?(y=u&255,u=y-w|0,((u|0)>-1?u:0-u|0)>>>0<z>>>0):0){u=d[q+f>>0]|0;A=u-v|0;if(((A|0)>-1?A:0-A|0)>>>0<z>>>0){a[r>>0]=(Oa(n,j,((v+1+w|0)>>>1)-(x<<1)+u>>1)|0)+x;B=c[m>>2]|0;C=o}else{B=z;C=j}z=d[q+p>>0]|0;u=z-w|0;if(((u|0)>-1?u:0-u|0)>>>0<B>>>0){a[t>>0]=(Oa(n,j,((v+1+w|0)>>>1)-(y<<1)+z>>1)|0)+y;D=C+1|0}else D=C;z=Oa(0-D|0,D,4-y+(w-v<<2)+x>>3)|0;x=a[3472+((w|512)-z)>>0]|0;a[s>>0]=a[3472+((v|512)+z)>>0]|0;a[q>>0]=x}b=b+-1|0;if(!b)break;else q=q+1|0}i=h;return}function Bc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=i;j=b+-1|0;k=a[b+1>>0]|0;l=d[j>>0]|0;m=d[b>>0]|0;n=l-m|0;o=f+4|0;do if((((n|0)>-1?n:0-n|0)>>>0<(c[o>>2]|0)>>>0?(p=d[b+-2>>0]|0,q=p-l|0,r=c[f+8>>2]|0,((q|0)>-1?q:0-q|0)>>>0<r>>>0):0)?(q=k&255,s=q-m|0,((s|0)>-1?s:0-s|0)>>>0<r>>>0):0)if(e>>>0<4){r=d[(c[f>>2]|0)+(e+-1)>>0]|0;s=Oa(~r,r+1|0,4-q+(m-l<<2)+p>>3)|0;r=a[3472+((m|512)-s)>>0]|0;a[j>>0]=a[3472+((l|512)+s)>>0]|0;a[b>>0]=r;break}else{a[j>>0]=(l+2+q+(p<<1)|0)>>>2;a[b>>0]=(m+2+(q<<1)+p|0)>>>2;break}while(0);m=b+g|0;l=b+(g+-1)|0;j=d[l>>0]|0;k=d[m>>0]|0;n=j-k|0;if(((n|0)>-1?n:0-n|0)>>>0>=(c[o>>2]|0)>>>0){i=h;return}o=d[b+(g+-2)>>0]|0;n=o-j|0;p=c[f+8>>2]|0;if(((n|0)>-1?n:0-n|0)>>>0>=p>>>0){i=h;return}n=d[b+(g+1)>>0]|0;g=n-k|0;if(((g|0)>-1?g:0-g|0)>>>0>=p>>>0){i=h;return}if(e>>>0<4){p=d[(c[f>>2]|0)+(e+-1)>>0]|0;e=Oa(~p,p+1|0,4-n+(k-j<<2)+o>>3)|0;p=a[3472+((k|512)-e)>>0]|0;a[l>>0]=a[3472+((j|512)+e)>>0]|0;a[m>>0]=p;i=h;return}else{a[l>>0]=(j+2+n+(o<<1)|0)>>>2;a[m>>0]=(k+2+(n<<1)+o|0)>>>2;i=h;return}}function Cc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;h=i;if(e>>>0<4){j=d[(c[f>>2]|0)+(e+-1)>>0]|0;e=j+1|0;k=0-g|0;l=f+4|0;m=k<<1;n=f+8|0;o=~j;j=b;p=8;while(1){q=j+k|0;r=a[j+g>>0]|0;s=d[q>>0]|0;t=d[j>>0]|0;u=s-t|0;if((((u|0)>-1?u:0-u|0)>>>0<(c[l>>2]|0)>>>0?(u=d[j+m>>0]|0,v=u-s|0,w=c[n>>2]|0,((v|0)>-1?v:0-v|0)>>>0<w>>>0):0)?(v=r&255,r=v-t|0,((r|0)>-1?r:0-r|0)>>>0<w>>>0):0){w=Oa(o,e,4-v+(t-s<<2)+u>>3)|0;u=a[3472+((t|512)-w)>>0]|0;a[q>>0]=a[3472+((s|512)+w)>>0]|0;a[j>>0]=u}p=p+-1|0;if(!p)break;else j=j+1|0}i=h;return}else{j=0-g|0;p=f+4|0;e=j<<1;o=f+8|0;f=b;b=8;while(1){n=f+j|0;m=a[f+g>>0]|0;l=d[n>>0]|0;k=d[f>>0]|0;u=l-k|0;if((((u|0)>-1?u:0-u|0)>>>0<(c[p>>2]|0)>>>0?(u=d[f+e>>0]|0,w=u-l|0,s=c[o>>2]|0,((w|0)>-1?w:0-w|0)>>>0<s>>>0):0)?(w=m&255,m=w-k|0,((m|0)>-1?m:0-m|0)>>>0<s>>>0):0){a[n>>0]=(l+2+w+(u<<1)|0)>>>2;a[f>>0]=(k+2+(w<<1)+u|0)>>>2}b=b+-1|0;if(!b)break;else f=f+1|0}i=h;return}}function Dc(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;h=i;j=d[(c[f>>2]|0)+(e+-1)>>0]|0;e=j+1|0;k=0-g|0;l=f+4|0;m=k<<1;n=f+8|0;f=~j;j=b+k|0;k=a[b+g>>0]|0;o=d[j>>0]|0;p=d[b>>0]|0;q=o-p|0;r=c[l>>2]|0;if((((q|0)>-1?q:0-q|0)>>>0<r>>>0?(q=d[b+m>>0]|0,s=q-o|0,t=c[n>>2]|0,((s|0)>-1?s:0-s|0)>>>0<t>>>0):0)?(s=k&255,k=s-p|0,((k|0)>-1?k:0-k|0)>>>0<t>>>0):0){t=Oa(f,e,4-s+(p-o<<2)+q>>3)|0;q=a[3472+((p|512)-t)>>0]|0;a[j>>0]=a[3472+((o|512)+t)>>0]|0;a[b>>0]=q;u=c[l>>2]|0}else u=r;r=b+1|0;l=b+(1-g)|0;q=d[l>>0]|0;t=d[r>>0]|0;o=q-t|0;if(((o|0)>-1?o:0-o|0)>>>0>=u>>>0){i=h;return}u=d[b+(m|1)>>0]|0;m=u-q|0;o=c[n>>2]|0;if(((m|0)>-1?m:0-m|0)>>>0>=o>>>0){i=h;return}m=d[b+(g+1)>>0]|0;g=m-t|0;if(((g|0)>-1?g:0-g|0)>>>0>=o>>>0){i=h;return}o=Oa(f,e,4-m+(t-q<<2)+u>>3)|0;u=a[3472+((t|512)-o)>>0]|0;a[l>>0]=a[3472+((q|512)+o)>>0]|0;a[r>>0]=u;i=h;return}function Ec(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;e=i;f=c[b+4>>2]|0;g=c[b+8>>2]|0;if(!((d|0)==0|(d|0)==5)?(c[a+3384>>2]|0)==0:0)h=0;else{j=a+1220|0;k=0;do{l=kc(j,k)|0;k=k+1|0}while(k>>>0<16&(l|0)==0);h=l}k=a+1176|0;j=c[k>>2]|0;if(j){l=c[a+1212>>2]|0;m=0;n=0;o=0;while(1){if(c[l+(n*216|0)+196>>2]|0){p=m;q=n;r=o;break}s=n+1|0;t=m+1|0;u=(t|0)==(f|0);v=(u&1)+o|0;w=u?0:t;if(s>>>0<j>>>0){m=w;n=s;o=v}else{p=w;q=s;r=v;break}}if((q|0)!=(j|0)){j=a+1212|0;q=c[j>>2]|0;o=Z(r,f)|0;if(p){n=a+1204|0;m=p;do{m=m+-1|0;l=m+o|0;Fc(q+(l*216|0)|0,b,r,m,d,h);c[q+(l*216|0)+196>>2]=1;c[n>>2]=(c[n>>2]|0)+1}while((m|0)!=0)}m=p+1|0;if(m>>>0<f>>>0){p=a+1204|0;n=m;do{m=n+o|0;l=q+(m*216|0)+196|0;if(!(c[l>>2]|0)){Fc(q+(m*216|0)|0,b,r,n,d,h);c[l>>2]=1;c[p>>2]=(c[p>>2]|0)+1}n=n+1|0}while((n|0)!=(f|0))}if(r)if(!f)x=r;else{n=r+-1|0;p=Z(n,f)|0;q=a+1204|0;o=0-f|0;l=0;do{m=n;v=(c[j>>2]|0)+((l+p|0)*216|0)|0;while(1){Fc(v,b,m,l,d,h);c[v+196>>2]=1;c[q>>2]=(c[q>>2]|0)+1;if(!m)break;else{m=m+-1|0;v=v+(o*216|0)|0}}l=l+1|0}while((l|0)!=(f|0));x=r}else x=0;r=x+1|0;if(r>>>0>=g>>>0){i=e;return 0}x=(f|0)==0;l=a+1204|0;o=r;do{r=c[j>>2]|0;q=Z(o,f)|0;if(!x){p=0;do{n=p+q|0;v=r+(n*216|0)+196|0;if(!(c[v>>2]|0)){Fc(r+(n*216|0)|0,b,o,p,d,h);c[v>>2]=1;c[l>>2]=(c[l>>2]|0)+1}p=p+1|0}while((p|0)!=(f|0))}o=o+1|0}while((o|0)!=(g|0));i=e;return 0}}if((d|0)==2|(d|0)==7)if((c[a+3384>>2]|0)==0|(h|0)==0)y=13;else y=14;else if(!h)y=13;else y=14;if((y|0)==13)ld(c[b>>2]|0,128,Z(f*384|0,g)|0);else if((y|0)==14)kd(c[b>>2]|0,h,Z(f*384|0,g)|0);g=c[k>>2]|0;c[a+1204>>2]=g;if(!g){i=e;return 0}k=c[a+1212>>2]|0;a=0;do{c[k+(a*216|0)+8>>2]=1;a=a+1|0}while(a>>>0<g>>>0);i=e;return 0}function Fc(b,e,f,g,h,j){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Oa=0;k=i;i=i+480|0;l=k+96|0;m=k+32|0;n=k+24|0;o=k;p=c[e+4>>2]|0;q=c[e+8>>2]|0;Na(e,(Z(p,f)|0)+g|0);r=c[e>>2]|0;s=f<<4;t=g<<4;u=(Z(f<<8,p)|0)+t|0;c[b+20>>2]=40;c[b+8>>2]=0;c[b>>2]=6;c[b+12>>2]=0;c[b+16>>2]=0;c[b+24>>2]=0;do if((h|0)==2|(h|0)==7)ld(l,0,384);else{c[n>>2]=0;c[o+4>>2]=p;c[o+8>>2]=q;c[o>>2]=j;if(!j){ld(l,0,384);break}fc(l,n,o,t,s,0,0,16,16);vc(e,l);i=k;return}while(0);ld(m,0,64);if((f|0)!=0?(c[b+((0-p|0)*216|0)+196>>2]|0)!=0:0){s=u-(p<<4)|0;t=s|1;o=s|3;n=(d[r+t>>0]|0)+(d[r+s>>0]|0)+(d[r+(t+1)>>0]|0)+(d[r+o>>0]|0)|0;t=s|7;j=(d[r+(o+2)>>0]|0)+(d[r+(o+1)>>0]|0)+(d[r+(o+3)>>0]|0)+(d[r+t>>0]|0)|0;o=(d[r+(t+2)>>0]|0)+(d[r+(t+1)>>0]|0)+(d[r+(t+3)>>0]|0)+(d[r+(t+4)>>0]|0)|0;h=(d[r+(t+6)>>0]|0)+(d[r+(t+5)>>0]|0)+(d[r+(t+7)>>0]|0)+(d[r+(s|15)>>0]|0)|0;s=j+n|0;c[m>>2]=o+s+(c[m>>2]|0)+h;t=m+4|0;c[t>>2]=s-o-h+(c[t>>2]|0);v=n;w=j;x=o;y=h;z=1}else{v=0;w=0;x=0;y=0;z=0}if((q+-1|0)!=(f|0)?(c[b+(p*216|0)+196>>2]|0)!=0:0){h=u+(p<<8)|0;o=h|1;j=h|3;n=(d[r+o>>0]|0)+(d[r+h>>0]|0)+(d[r+(o+1)>>0]|0)+(d[r+j>>0]|0)|0;o=h|7;t=(d[r+(j+2)>>0]|0)+(d[r+(j+1)>>0]|0)+(d[r+(j+3)>>0]|0)+(d[r+o>>0]|0)|0;j=(d[r+(o+2)>>0]|0)+(d[r+(o+1)>>0]|0)+(d[r+(o+3)>>0]|0)+(d[r+(o+4)>>0]|0)|0;s=(d[r+(o+6)>>0]|0)+(d[r+(o+5)>>0]|0)+(d[r+(o+7)>>0]|0)+(d[r+(h|15)>>0]|0)|0;h=t+n|0;c[m>>2]=j+h+(c[m>>2]|0)+s;o=m+4|0;c[o>>2]=h-j-s+(c[o>>2]|0);A=1;B=n;C=t;D=j;E=s;F=z+1|0}else{A=0;B=0;C=0;D=0;E=0;F=z}if((g|0)!=0?(c[b+-20>>2]|0)!=0:0){s=u+-1|0;j=p<<4;t=p<<5;n=p*48|0;o=(d[r+(s+j)>>0]|0)+(d[r+s>>0]|0)+(d[r+(s+t)>>0]|0)+(d[r+(s+n)>>0]|0)|0;h=p<<6;G=s+h|0;s=(d[r+(G+j)>>0]|0)+(d[r+G>>0]|0)+(d[r+(G+t)>>0]|0)+(d[r+(G+n)>>0]|0)|0;H=G+h|0;G=(d[r+(H+j)>>0]|0)+(d[r+H>>0]|0)+(d[r+(H+t)>>0]|0)+(d[r+(H+n)>>0]|0)|0;I=H+h|0;h=(d[r+(I+j)>>0]|0)+(d[r+I>>0]|0)+(d[r+(I+t)>>0]|0)+(d[r+(I+n)>>0]|0)|0;n=s+o|0;c[m>>2]=G+n+(c[m>>2]|0)+h;I=m+16|0;c[I>>2]=n-G-h+(c[I>>2]|0);J=F+1|0;K=o;L=s;M=G;N=h;O=1}else{J=F;K=0;L=0;M=0;N=0;O=0}do if((p+-1|0)!=(g|0)?(c[b+412>>2]|0)!=0:0){h=u+16|0;G=p<<4;s=p<<5;o=p*48|0;I=(d[r+(h+G)>>0]|0)+(d[r+h>>0]|0)+(d[r+(h+s)>>0]|0)+(d[r+(h+o)>>0]|0)|0;n=p<<6;t=h+n|0;h=(d[r+(t+G)>>0]|0)+(d[r+t>>0]|0)+(d[r+(t+s)>>0]|0)+(d[r+(t+o)>>0]|0)|0;j=t+n|0;t=(d[r+(j+G)>>0]|0)+(d[r+j>>0]|0)+(d[r+(j+s)>>0]|0)+(d[r+(j+o)>>0]|0)|0;H=j+n|0;n=(d[r+(H+G)>>0]|0)+(d[r+H>>0]|0)+(d[r+(H+s)>>0]|0)+(d[r+(H+o)>>0]|0)|0;o=J+1|0;H=O+1|0;s=h+I|0;c[m>>2]=t+s+(c[m>>2]|0)+n;G=m+16|0;j=s-t-n+(c[G>>2]|0)|0;c[G>>2]=j;G=(F|0)==0;s=(O|0)!=0;if(!(G&s)){if(!G){P=1;Q=o;R=s;S=H;T=21;break}}else c[m+4>>2]=M+N+L+K-I-h-t-n>>5;U=j;V=1;W=o;X=s;Y=(z|0)!=0;_=(A|0)!=0;$=H;T=27}else T=17;while(0);if((T|0)==17){r=(O|0)!=0;if(!F){aa=0;ba=J;ca=r;da=O;T=23}else{P=0;Q=J;R=r;S=O;T=21}}if((T|0)==21){O=m+4|0;c[O>>2]=c[O>>2]>>F+3;aa=P;ba=Q;ca=R;da=S;T=23}do if((T|0)==23){S=(da|0)==0;R=(z|0)!=0;Q=(A|0)!=0;if(S&R&Q){c[m+16>>2]=x+y+w+v-E-D-C-B>>5;ea=aa;fa=ba;ga=ca;ha=1;ia=1;break}if(S){ea=aa;fa=ba;ga=ca;ha=R;ia=Q}else{U=c[m+16>>2]|0;V=aa;W=ba;X=ca;Y=R;_=Q;$=da;T=27}}while(0);if((T|0)==27){c[m+16>>2]=U>>$+3;ea=V;fa=W;ga=X;ha=Y;ia=_}if((fa|0)==1)c[m>>2]=c[m>>2]>>4;else if((fa|0)==2)c[m>>2]=c[m>>2]>>5;else if((fa|0)==3)c[m>>2]=(c[m>>2]|0)*21>>10;else c[m>>2]=c[m>>2]>>6;Gc(m);fa=0;_=l;Y=m;while(1){X=c[Y+((fa>>>2&3)<<2)>>2]|0;if((X|0)<0)ja=0;else ja=(X|0)>255?-1:X&255;a[_>>0]=ja;X=fa+1|0;if((X|0)==256)break;else{fa=X;_=_+1|0;Y=(X&63|0)==0?Y+16|0:Y}}Y=Z(q,p)|0;q=p<<3;_=0-q|0;fa=_|1;ja=fa+1|0;X=_|3;W=X+1|0;V=X+2|0;$=X+3|0;U=_|7;da=m+4|0;ca=p<<6;ba=ca|1;aa=ba+1|0;A=ca|3;z=A+1|0;Q=A+2|0;R=A+3|0;S=ca|7;P=q+-1|0;F=p<<4;O=F+-1|0;r=O+q|0;J=O+F|0;u=J+q|0;b=J+F|0;H=b+q|0;s=m+16|0;o=q+8|0;j=F|8;n=j+q|0;t=j+F|0;h=t+q|0;I=t+F|0;F=I+q|0;q=Y<<6;G=v;v=w;w=x;x=y;y=B;B=C;C=D;D=E;E=0;ka=K;K=L;L=M;M=N;N=(c[e>>2]|0)+((Z(f<<6,p)|0)+(g<<3)+(Y<<8))|0;while(1){ld(m,0,64);if(ha){Y=(d[N+fa>>0]|0)+(d[N+_>>0]|0)|0;g=(d[N+X>>0]|0)+(d[N+ja>>0]|0)|0;p=(d[N+V>>0]|0)+(d[N+W>>0]|0)|0;f=(d[N+U>>0]|0)+(d[N+$>>0]|0)|0;la=g+Y|0;c[m>>2]=p+la+(c[m>>2]|0)+f;c[da>>2]=la-p-f+(c[da>>2]|0);ma=Y;na=g;oa=p;pa=f;qa=1}else{ma=G;na=v;oa=w;pa=x;qa=0}if(ia){f=(d[N+ba>>0]|0)+(d[N+ca>>0]|0)|0;p=(d[N+A>>0]|0)+(d[N+aa>>0]|0)|0;g=(d[N+Q>>0]|0)+(d[N+z>>0]|0)|0;Y=(d[N+S>>0]|0)+(d[N+R>>0]|0)|0;la=p+f|0;c[m>>2]=g+la+(c[m>>2]|0)+Y;c[da>>2]=la-g-Y+(c[da>>2]|0);ra=f;sa=p;ta=g;ua=Y;va=qa+1|0}else{ra=y;sa=B;ta=C;ua=D;va=qa}if(ga){Y=(d[N+P>>0]|0)+(d[N+-1>>0]|0)|0;g=(d[N+r>>0]|0)+(d[N+O>>0]|0)|0;p=(d[N+u>>0]|0)+(d[N+J>>0]|0)|0;f=(d[N+H>>0]|0)+(d[N+b>>0]|0)|0;la=g+Y|0;c[m>>2]=p+la+(c[m>>2]|0)+f;c[s>>2]=la-p-f+(c[s>>2]|0);wa=va+1|0;xa=Y;ya=g;za=p;Aa=f;Ba=1}else{wa=va;xa=ka;ya=K;za=L;Aa=M;Ba=0}do if(ea){f=(d[N+o>>0]|0)+(d[N+8>>0]|0)|0;p=(d[N+n>>0]|0)+(d[N+j>>0]|0)|0;g=(d[N+h>>0]|0)+(d[N+t>>0]|0)|0;Y=(d[N+F>>0]|0)+(d[N+I>>0]|0)|0;la=wa+1|0;Ca=Ba+1|0;Da=p+f|0;c[m>>2]=g+Da+(c[m>>2]|0)+Y;Ea=Da-g-Y+(c[s>>2]|0)|0;c[s>>2]=Ea;Da=(va|0)==0;if(!(Da&ga))if(Da){Fa=Ea;Ga=la;Ha=Ca;T=54;break}else{Ia=la;Ja=Ca;T=49;break}else{c[da>>2]=za+Aa+ya+xa-f-p-g-Y>>4;Fa=Ea;Ga=la;Ha=Ca;T=54;break}}else if(!va){Ka=wa;La=Ba;T=50}else{Ia=wa;Ja=Ba;T=49}while(0);if((T|0)==49){T=0;c[da>>2]=c[da>>2]>>va+2;Ka=Ia;La=Ja;T=50}do if((T|0)==50){T=0;Ca=(La|0)==0;if(Ca&ha&ia){c[s>>2]=oa+pa+na+ma-ua-ta-sa-ra>>4;Ma=Ka;break}if(Ca)Ma=Ka;else{Fa=c[s>>2]|0;Ga=Ka;Ha=La;T=54}}while(0);if((T|0)==54){T=0;c[s>>2]=Fa>>Ha+2;Ma=Ga}if((Ma|0)==1)c[m>>2]=c[m>>2]>>3;else if((Ma|0)==2)c[m>>2]=c[m>>2]>>4;else if((Ma|0)==3)c[m>>2]=(c[m>>2]|0)*21>>9;else c[m>>2]=c[m>>2]>>5;Gc(m);Ca=0;la=l+((E<<6)+256)|0;Ea=m;while(1){Y=c[Ea+((Ca>>>1&3)<<2)>>2]|0;if((Y|0)<0)Oa=0;else Oa=(Y|0)>255?-1:Y&255;a[la>>0]=Oa;Y=Ca+1|0;if((Y|0)==64)break;else{Ca=Y;la=la+1|0;Ea=(Y&15|0)==0?Ea+16|0:Ea}}E=E+1|0;if((E|0)==2)break;else{G=ma;v=na;w=oa;x=pa;y=ra;B=sa;C=ta;D=ua;ka=xa;K=ya;L=za;M=Aa;N=N+q|0}}vc(e,l);i=k;return}function Gc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0;b=i;d=a+4|0;e=c[d>>2]|0;f=a+16|0;g=c[f>>2]|0;h=c[a>>2]|0;if(!(e|g)){c[a+60>>2]=h;c[a+56>>2]=h;c[a+52>>2]=h;c[a+48>>2]=h;c[a+44>>2]=h;c[a+40>>2]=h;c[a+36>>2]=h;c[a+32>>2]=h;c[a+28>>2]=h;c[a+24>>2]=h;c[a+20>>2]=h;c[f>>2]=h;c[a+12>>2]=h;c[a+8>>2]=h;c[d>>2]=h;i=b;return}else{f=e+h|0;j=e>>1;k=j+h|0;l=h-j|0;j=h-e|0;c[a>>2]=g+f;e=g>>1;c[a+16>>2]=e+f;c[a+32>>2]=f-e;c[a+48>>2]=f-g;c[d>>2]=g+k;c[a+20>>2]=e+k;c[a+36>>2]=k-e;c[a+52>>2]=k-g;c[a+8>>2]=g+l;c[a+24>>2]=e+l;c[a+40>>2]=l-e;c[a+56>>2]=l-g;c[a+12>>2]=g+j;c[a+28>>2]=e+j;c[a+44>>2]=j-e;c[a+60>>2]=j-g;i=b;return}}function Hc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0;d=i;ld(b,0,952);e=jb(a,1)|0;if((e|0)==-1){f=1;i=d;return f|0}g=(e|0)==1;c[b>>2]=g&1;do if(g){e=jb(a,8)|0;if((e|0)==-1){f=1;i=d;return f|0}c[b+4>>2]=e;if((e|0)==255){e=jb(a,16)|0;if((e|0)==-1){f=1;i=d;return f|0}c[b+8>>2]=e;e=jb(a,16)|0;if((e|0)==-1){f=1;i=d;return f|0}else{c[b+12>>2]=e;break}}}while(0);g=jb(a,1)|0;if((g|0)==-1){f=1;i=d;return f|0}e=(g|0)==1;c[b+16>>2]=e&1;do if(e){g=jb(a,1)|0;if((g|0)==-1){f=1;i=d;return f|0}else{c[b+20>>2]=(g|0)==1&1;break}}while(0);e=jb(a,1)|0;if((e|0)==-1){f=1;i=d;return f|0}g=(e|0)==1;c[b+24>>2]=g&1;do if(g){e=jb(a,3)|0;if((e|0)==-1){f=1;i=d;return f|0}c[b+28>>2]=e;e=jb(a,1)|0;if((e|0)==-1){f=1;i=d;return f|0}c[b+32>>2]=(e|0)==1&1;e=jb(a,1)|0;if((e|0)==-1){f=1;i=d;return f|0}h=(e|0)==1;c[b+36>>2]=h&1;if(!h){c[b+40>>2]=2;c[b+44>>2]=2;c[b+48>>2]=2;break}h=jb(a,8)|0;if((h|0)==-1){f=1;i=d;return f|0}c[b+40>>2]=h;h=jb(a,8)|0;if((h|0)==-1){f=1;i=d;return f|0}c[b+44>>2]=h;h=jb(a,8)|0;if((h|0)==-1){f=1;i=d;return f|0}else{c[b+48>>2]=h;break}}else{c[b+28>>2]=5;c[b+40>>2]=2;c[b+44>>2]=2;c[b+48>>2]=2}while(0);g=jb(a,1)|0;if((g|0)==-1){f=1;i=d;return f|0}h=(g|0)==1;c[b+52>>2]=h&1;if(h){h=b+56|0;g=nb(a,h)|0;if(g){f=g;i=d;return f|0}if((c[h>>2]|0)>>>0>5){f=1;i=d;return f|0}h=b+60|0;g=nb(a,h)|0;if(g){f=g;i=d;return f|0}if((c[h>>2]|0)>>>0>5){f=1;i=d;return f|0}}h=jb(a,1)|0;if((h|0)==-1){f=1;i=d;return f|0}g=(h|0)==1;c[b+64>>2]=g&1;do if(g){h=kb(a)|0;if((lb(a,32)|0)==-1|(h|0)==0){f=1;i=d;return f|0}c[b+68>>2]=h;h=kb(a)|0;if((lb(a,32)|0)==-1|(h|0)==0){f=1;i=d;return f|0}c[b+72>>2]=h;h=jb(a,1)|0;if((h|0)==-1){f=1;i=d;return f|0}else{c[b+76>>2]=(h|0)==1&1;break}}while(0);g=jb(a,1)|0;if((g|0)==-1){f=1;i=d;return f|0}h=(g|0)==1;g=b+80|0;c[g>>2]=h&1;if(h){h=Ic(a,b+84|0)|0;if(h){f=h;i=d;return f|0}}else{c[b+84>>2]=1;c[b+96>>2]=288000001;c[b+224>>2]=288000001;c[b+480>>2]=24;c[b+484>>2]=24;c[b+488>>2]=24;c[b+492>>2]=24}h=jb(a,1)|0;if((h|0)==-1){f=1;i=d;return f|0}e=(h|0)==1;h=b+496|0;c[h>>2]=e&1;if(e){e=Ic(a,b+500|0)|0;if(e){f=e;i=d;return f|0}}else{c[b+500>>2]=1;c[b+512>>2]=240000001;c[b+640>>2]=240000001;c[b+896>>2]=24;c[b+900>>2]=24;c[b+904>>2]=24;c[b+908>>2]=24}if(!((c[g>>2]|0)==0?(c[h>>2]|0)==0:0))j=46;do if((j|0)==46){h=jb(a,1)|0;if((h|0)==-1){f=1;i=d;return f|0}else{c[b+912>>2]=(h|0)==1&1;break}}while(0);j=jb(a,1)|0;if((j|0)==-1){f=1;i=d;return f|0}c[b+916>>2]=(j|0)==1&1;j=jb(a,1)|0;if((j|0)==-1){f=1;i=d;return f|0}h=(j|0)==1;c[b+920>>2]=h&1;do if(h){j=jb(a,1)|0;if((j|0)==-1){f=1;i=d;return f|0}c[b+924>>2]=(j|0)==1&1;j=b+928|0;g=nb(a,j)|0;if(g){f=g;i=d;return f|0}if((c[j>>2]|0)>>>0>16){f=1;i=d;return f|0}j=b+932|0;g=nb(a,j)|0;if(g){f=g;i=d;return f|0}if((c[j>>2]|0)>>>0>16){f=1;i=d;return f|0}j=b+936|0;g=nb(a,j)|0;if(g){f=g;i=d;return f|0}if((c[j>>2]|0)>>>0>16){f=1;i=d;return f|0}j=b+940|0;g=nb(a,j)|0;if(g){f=g;i=d;return f|0}if((c[j>>2]|0)>>>0>16){f=1;i=d;return f|0}j=nb(a,b+944|0)|0;if(j){f=j;i=d;return f|0}j=nb(a,b+948|0)|0;if(!j)break;else f=j;i=d;return f|0}else{c[b+924>>2]=1;c[b+928>>2]=2;c[b+932>>2]=1;c[b+936>>2]=16;c[b+940>>2]=16;c[b+944>>2]=16;c[b+948>>2]=16}while(0);f=0;i=d;return f|0}function Ic(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;d=i;e=nb(a,b)|0;if(e){f=e;i=d;return f|0}e=(c[b>>2]|0)+1|0;c[b>>2]=e;if(e>>>0>32){f=1;i=d;return f|0}e=jb(a,4)|0;if((e|0)==-1){f=1;i=d;return f|0}g=b+4|0;c[g>>2]=e;e=jb(a,4)|0;if((e|0)==-1){f=1;i=d;return f|0}h=b+8|0;c[h>>2]=e;a:do if(c[b>>2]|0){e=0;while(1){j=b+(e<<2)+12|0;k=nb(a,j)|0;if(k){f=k;l=17;break}k=c[j>>2]|0;if((k|0)==-1){f=1;l=17;break}m=k+1|0;c[j>>2]=m;c[j>>2]=m<<(c[g>>2]|0)+6;m=b+(e<<2)+140|0;j=nb(a,m)|0;if(j){f=j;l=17;break}j=c[m>>2]|0;if((j|0)==-1){f=1;l=17;break}k=j+1|0;c[m>>2]=k;c[m>>2]=k<<(c[h>>2]|0)+4;k=jb(a,1)|0;if((k|0)==-1){f=1;l=17;break}c[b+(e<<2)+268>>2]=(k|0)==1&1;e=e+1|0;if(e>>>0>=(c[b>>2]|0)>>>0)break a}if((l|0)==17){i=d;return f|0}}while(0);l=jb(a,5)|0;if((l|0)==-1){f=1;i=d;return f|0}c[b+396>>2]=l+1;l=jb(a,5)|0;if((l|0)==-1){f=1;i=d;return f|0}c[b+400>>2]=l+1;l=jb(a,5)|0;if((l|0)==-1){f=1;i=d;return f|0}c[b+404>>2]=l+1;l=jb(a,5)|0;if((l|0)==-1){f=1;i=d;return f|0}c[b+408>>2]=l;f=0;i=d;return f|0}function Jc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;f=i;a:do if(!(c[d+284>>2]|0))g=0;else{h=0;while(1){j=c[d+(h*20|0)+288>>2]|0;if((j|0)==5){g=1;break a}else if(!j)break;h=h+1|0}g=0}while(0);h=c[b+16>>2]|0;if((h|0)==1){if((c[e>>2]|0)!=5){j=c[a+12>>2]|0;if((c[a+8>>2]|0)>>>0>(c[d+12>>2]|0)>>>0)k=(c[b+12>>2]|0)+j|0;else k=j}else k=0;j=c[b+36>>2]|0;l=(j|0)==0;if(l)m=0;else m=(c[d+12>>2]|0)+k|0;n=(c[e+4>>2]|0)==0;o=((n&(m|0)!=0)<<31>>31)+m|0;m=(o|0)!=0;if(m){p=o+-1|0;q=(p>>>0)%(j>>>0)|0;r=(p>>>0)/(j>>>0)|0}else{q=0;r=0}if(l)s=0;else{l=c[b+40>>2]|0;p=0;o=0;while(1){t=(c[l+(o<<2)>>2]|0)+p|0;o=o+1|0;if(o>>>0>=j>>>0){s=t;break}else p=t}}if(m){m=Z(s,r)|0;r=c[b+40>>2]|0;s=0;p=m;while(1){m=(c[r+(s<<2)>>2]|0)+p|0;s=s+1|0;if(s>>>0>q>>>0){u=m;break}else p=m}}else u=0;if(n)v=(c[b+28>>2]|0)+u|0;else v=u;u=(c[d+32>>2]|0)+(c[b+32>>2]|0)|0;n=a+12|0;if(!g){p=((u|0)<0?u:0)+v+(c[d+28>>2]|0)|0;c[n>>2]=k;c[a+8>>2]=c[d+12>>2];w=p;i=f;return w|0}else{c[n>>2]=0;c[a+8>>2]=0;w=0;i=f;return w|0}}else if(!h){if((c[e>>2]|0)!=5){h=c[a>>2]|0;n=c[d+20>>2]|0;if(h>>>0>n>>>0?(p=c[b+20>>2]|0,(h-n|0)>>>0>=p>>>1>>>0):0){x=n;y=(c[a+4>>2]|0)+p|0;z=a}else{A=n;B=h;C=a;D=11}}else{c[a+4>>2]=0;c[a>>2]=0;A=c[d+20>>2]|0;B=0;C=a;D=11}do if((D|0)==11){if(A>>>0>B>>>0?(h=c[b+20>>2]|0,(A-B|0)>>>0>h>>>1>>>0):0){x=A;y=(c[a+4>>2]|0)-h|0;z=C;break}x=A;y=c[a+4>>2]|0;z=C}while(0);if(!(c[e+4>>2]|0)){C=c[d+24>>2]|0;w=x+y+((C|0)<0?C:0)|0;i=f;return w|0}c[a+4>>2]=y;C=c[d+24>>2]|0;A=(C|0)<0;if(!g){c[z>>2]=x;w=x+y+(A?C:0)|0;i=f;return w|0}else{c[a+4>>2]=0;c[z>>2]=A?0-C|0:0;w=0;i=f;return w|0}}else{if((c[e>>2]|0)==5){E=0;F=0;G=a+12|0}else{C=c[d+12>>2]|0;A=a+12|0;z=c[A>>2]|0;if((c[a+8>>2]|0)>>>0>C>>>0)H=(c[b+12>>2]|0)+z|0;else H=z;E=H;F=(C+H<<1)+(((c[e+4>>2]|0)==0)<<31>>31)|0;G=A}if(!g){c[G>>2]=E;c[a+8>>2]=c[d+12>>2];w=F;i=f;return w|0}else{c[G>>2]=0;c[a+8>>2]=0;w=0;i=f;return w|0}}return 0}function Kc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;Ab(a);e=id(2112)|0;c[a+3376>>2]=e;if(e)if(!b)f=0;else{c[a+1216>>2]=1;f=0}else f=1;i=d;return f|0}
function Lc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;g=i;i=i+208|0;h=g+204|0;j=g;k=g+112|0;l=g+40|0;m=g+16|0;n=g+12|0;o=g+8|0;c[n>>2]=0;p=a+3344|0;if((c[p>>2]|0)!=0?(c[a+3348>>2]|0)==(b|0):0){q=a+3356|0;c[m+0>>2]=c[q+0>>2];c[m+4>>2]=c[q+4>>2];c[m+8>>2]=c[q+8>>2];c[m+12>>2]=c[q+12>>2];c[m+4>>2]=c[m>>2];c[m+8>>2]=0;c[m+16>>2]=0;c[f>>2]=c[a+3352>>2]}else r=4;do if((r|0)==4)if(!(Pa(b,d,m,f)|0)){q=a+3356|0;c[q+0>>2]=c[m+0>>2];c[q+4>>2]=c[m+4>>2];c[q+8>>2]=c[m+8>>2];c[q+12>>2]=c[m+12>>2];c[q+16>>2]=c[m+16>>2];c[a+3352>>2]=c[f>>2];c[a+3348>>2]=b;break}else{s=3;i=g;return s|0}while(0);c[p>>2]=0;if(sb(m,j)|0){s=3;i=g;return s|0}if(((c[j>>2]|0)+-1|0)>>>0>11){s=0;i=g;return s|0}b=Ib(m,j,a,n)|0;if(!b){do if(!(c[n>>2]|0))r=19;else{if((c[a+1184>>2]|0)!=0?(c[a+16>>2]|0)!=0:0){if(c[a+3380>>2]|0){s=3;i=g;return s|0}if(!(c[a+1188>>2]|0)){d=a+1220|0;q=a+1336|0;c[q>>2]=lc(d)|0;pc(d);Ec(a,q,0)|0}else Ec(a,a+1336|0,c[a+1372>>2]|0)|0;c[f>>2]=0;c[p>>2]=1;c[a+1180>>2]=0;t=a+1336|0;u=a+1360|0;break}c[a+1188>>2]=0;c[a+1180>>2]=0;r=19}while(0);do if((r|0)==19){n=c[j>>2]|0;if((n|0)==7)if(!(Qa(m,k)|0)){Bb(a,k)|0;s=0;i=g;return s|0}else{q=k+40|0;jd(c[q>>2]|0);c[q>>2]=0;q=k+84|0;jd(c[q>>2]|0);c[q>>2]=0;s=3;i=g;return s|0}else if((n|0)==8)if(!(Sa(m,l)|0)){Cb(a,l)|0;s=0;i=g;return s|0}else{q=l+20|0;jd(c[q>>2]|0);c[q>>2]=0;q=l+24|0;jd(c[q>>2]|0);c[q>>2]=0;q=l+28|0;jd(c[q>>2]|0);c[q>>2]=0;q=l+44|0;jd(c[q>>2]|0);c[q>>2]=0;s=3;i=g;return s|0}else if((n|0)==1|(n|0)==5){n=a+1180|0;if(c[a+1180>>2]|0){s=0;i=g;return s|0}c[a+1184>>2]=1;if(Fb(a)|0){c[a+1204>>2]=0;c[a+1208>>2]=e;Ua(m,h)|0;q=a+8|0;d=c[q>>2]|0;v=Db(a,c[h>>2]|0,(c[j>>2]|0)==5&1)|0;if(v){c[a+4>>2]=256;c[a+12>>2]=0;c[q>>2]=32;c[a+16>>2]=0;c[a+3380>>2]=0;s=(v|0)==65535?5:4;i=g;return s|0}if((d|0)!=(c[q>>2]|0)){d=c[a+16>>2]|0;c[o>>2]=1;v=c[a>>2]|0;if(v>>>0<32)w=c[a+(v<<2)+20>>2]|0;else w=0;c[f>>2]=0;c[p>>2]=1;if((((((c[j>>2]|0)==5?(v=_a(o,m,d,c[a+12>>2]|0,5)|0,(c[o>>2]|v|0)==0):0)?(v=a+1220|0,!((c[a+1276>>2]|0)!=0|(w|0)==0)):0)?(c[w+52>>2]|0)==(c[d+52>>2]|0):0)?(c[w+56>>2]|0)==(c[d+56>>2]|0):0)?(c[w+88>>2]|0)==(c[d+88>>2]|0):0)sc(v);else c[a+1280>>2]=0;c[a>>2]=c[q>>2];s=2;i=g;return s|0}}if(c[a+3380>>2]|0){s=3;i=g;return s|0}q=a+1368|0;v=a+2356|0;d=a+16|0;if(Ta(m,v,c[d>>2]|0,c[a+12>>2]|0,j)|0){s=3;i=g;return s|0}if(!(Fb(a)|0))x=a+1220|0;else{y=a+1220|0;if((c[j>>2]|0)!=5?(qc(y,c[a+2368>>2]|0,(c[j+4>>2]|0)!=0&1,c[(c[d>>2]|0)+48>>2]|0)|0)!=0:0){s=3;i=g;return s|0}c[a+1336>>2]=lc(y)|0;x=y}rd(q|0,v|0,988)|0;c[a+1188>>2]=1;v=a+1360|0;y=j;d=c[y+4>>2]|0;z=v;c[z>>2]=c[y>>2];c[z+4>>2]=d;Hb(a,c[a+1432>>2]|0);pc(x);if(ic(x,a+1436|0,c[a+1380>>2]|0,c[a+1412>>2]|0)|0){s=3;i=g;return s|0}d=a+1336|0;if($a(m,a,d,q)|0){ab(a,c[q>>2]|0);s=3;i=g;return s|0}if(Gb(a)|0){c[n>>2]=1;t=d;u=v;break}else{s=0;i=g;return s|0}}else{s=0;i=g;return s|0}}while(0);xc(t,c[a+1212>>2]|0);Eb(a);m=Jc(a+1284|0,c[a+16>>2]|0,a+1368|0,u)|0;x=a+1188|0;do if(c[x>>2]|0){j=a+1220|0;if(!(c[a+1364>>2]|0)){jc(j,0,t,c[a+1380>>2]|0,m,(c[u>>2]|0)==5&1,c[a+1208>>2]|0,c[a+1204>>2]|0)|0;break}else{jc(j,a+1644|0,t,c[a+1380>>2]|0,m,(c[u>>2]|0)==5&1,c[a+1208>>2]|0,c[a+1204>>2]|0)|0;break}}while(0);c[a+1184>>2]=0;c[x>>2]=0;s=1;i=g;return s|0}else if((b|0)==65520){s=4;i=g;return s|0}else{s=3;i=g;return s|0}return 0}function Mc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=i;d=0;do{e=a+(d<<2)+20|0;f=c[e>>2]|0;if(f){jd(c[f+40>>2]|0);c[(c[e>>2]|0)+40>>2]=0;jd(c[(c[e>>2]|0)+84>>2]|0);c[(c[e>>2]|0)+84>>2]=0;jd(c[e>>2]|0);c[e>>2]=0}d=d+1|0}while((d|0)!=32);g=0;do{d=a+(g<<2)+148|0;e=c[d>>2]|0;if(e){jd(c[e+20>>2]|0);c[(c[d>>2]|0)+20>>2]=0;jd(c[(c[d>>2]|0)+24>>2]|0);c[(c[d>>2]|0)+24>>2]=0;jd(c[(c[d>>2]|0)+28>>2]|0);c[(c[d>>2]|0)+28>>2]=0;jd(c[(c[d>>2]|0)+44>>2]|0);c[(c[d>>2]|0)+44>>2]=0;jd(c[d>>2]|0);c[d>>2]=0}g=g+1|0}while((g|0)!=256);g=a+3376|0;jd(c[g>>2]|0);c[g>>2]=0;g=a+1212|0;jd(c[g>>2]|0);c[g>>2]=0;g=a+1172|0;jd(c[g>>2]|0);c[g>>2]=0;oc(a+1220|0);i=b;return}function Nc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=i;g=rc(a+1220|0)|0;if(!g){h=0;i=f;return h|0}c[b>>2]=c[g+4>>2];c[d>>2]=c[g+12>>2];c[e>>2]=c[g+8>>2];h=c[g>>2]|0;i=f;return h|0}function Oc(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+16>>2]|0;if(!d){e=0;i=b;return e|0}e=c[d+52>>2]|0;i=b;return e|0}function Pc(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+16>>2]|0;if(!d){e=0;i=b;return e|0}e=c[d+56>>2]|0;i=b;return e|0}function Qc(a){a=a|0;var b=0;b=i;sc(a+1220|0);i=b;return}function Rc(a){a=a|0;var b=0,c=0;b=i;c=(Jb(a)|0)==0&1;i=b;return c|0}function Sc(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+16>>2]|0;if(((((d|0)!=0?(c[d+80>>2]|0)!=0:0)?(a=c[d+84>>2]|0,(a|0)!=0):0)?(c[a+24>>2]|0)!=0:0)?(c[a+32>>2]|0)!=0:0){e=1;i=b;return e|0}e=0;i=b;return e|0}function Tc(a){a=a|0;var b=0,d=0,e=0;b=i;d=c[a+16>>2]|0;if(((((d|0)!=0?(c[d+80>>2]|0)!=0:0)?(a=c[d+84>>2]|0,(a|0)!=0):0)?(c[a+24>>2]|0)!=0:0)?(c[a+36>>2]|0)!=0:0)e=c[a+48>>2]|0;else e=2;i=b;return e|0}function Uc(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0;h=i;j=c[a+16>>2]|0;if((j|0)!=0?(c[j+60>>2]|0)!=0:0){c[b>>2]=1;a=j+64|0;c[d>>2]=c[a>>2]<<1;c[e>>2]=(c[j+52>>2]<<4)-((c[j+68>>2]|0)+(c[a>>2]|0)<<1);a=j+72|0;c[f>>2]=c[a>>2]<<1;k=(c[j+56>>2]<<4)-((c[j+76>>2]|0)+(c[a>>2]|0)<<1)|0;c[g>>2]=k;i=h;return}c[b>>2]=0;c[d>>2]=0;c[e>>2]=0;c[f>>2]=0;k=0;c[g>>2]=k;i=h;return}function Vc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0;e=i;f=c[a+16>>2]|0;a:do if((((f|0)!=0?(c[f+80>>2]|0)!=0:0)?(a=c[f+84>>2]|0,(a|0)!=0):0)?(c[a>>2]|0)!=0:0){g=c[a+4>>2]|0;do switch(g|0){case 11:{h=11;j=15;break a;break}case 1:case 0:{h=g;j=g;break a;break}case 255:{k=c[a+8>>2]|0;l=c[a+12>>2]|0;m=(k|0)==0|(l|0)==0;h=m?0:l;j=m?0:k;break a;break}case 13:{h=99;j=160;break a;break}case 9:{h=33;j=80;break a;break}case 12:{h=33;j=64;break a;break}case 8:{h=11;j=32;break a;break}case 7:{h=11;j=20;break a;break}case 10:{h=11;j=18;break a;break}case 3:{h=11;j=10;break a;break}case 6:{h=11;j=24;break a;break}case 2:{h=11;j=12;break a;break}case 4:{h=11;j=16;break a;break}case 5:{h=33;j=40;break a;break}default:{h=0;j=0;break a}}while(0)}else{h=1;j=1}while(0);c[b>>2]=j;c[d>>2]=h;i=e;return}function Wc(a){a=a|0;var b=0,d=0;b=c[a+16>>2]|0;if(!b)d=0;else d=c[b>>2]|0;return d|0}function Xc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;do if(a){e=id(3396)|0;if(e){f=e+8|0;if(!(Kc(f,b)|0)){c[e>>2]=1;c[e+4>>2]=0;c[a>>2]=e;g=0;break}else{Mc(f);jd(e);g=-4;break}}else g=-4}else g=-1;while(0);i=d;return g|0}function Yc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;if((a|0)==0|(b|0)==0){e=-1;i=d;return e|0}f=a+8|0;if(!(c[a+24>>2]|0)){e=-6;i=d;return e|0}if(!(c[a+20>>2]|0)){e=-6;i=d;return e|0}c[b+4>>2]=(Oc(f)|0)<<4;c[b+8>>2]=(Pc(f)|0)<<4;c[b+12>>2]=Sc(f)|0;c[b+16>>2]=Tc(f)|0;Uc(f,b+28|0,b+32|0,b+36|0,b+40|0,b+44|0);Vc(f,b+20|0,b+24|0);c[b>>2]=Wc(f)|0;e=0;i=d;return e|0}function Zc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;e=i;i=i+16|0;f=e;a:do if((!((b|0)==0|(d|0)==0)?(g=c[b>>2]|0,(g|0)!=0):0)?(h=c[b+4>>2]|0,(h|0)!=0):0)if((a|0)!=0?(j=c[a>>2]|0,(j|0)!=0):0){c[d>>2]=0;c[f>>2]=0;k=a+8|0;c[a+3392>>2]=c[b+12>>2];l=b+8|0;m=j;j=1;n=h;h=g;while(1){if((m|0)==2){o=8;break}g=Lc(k,h,n,c[l>>2]|0,f)|0;p=c[f>>2]|0;q=h+p|0;r=n-p|0;s=(r|0)<0?0:r;c[d>>2]=q;if((g|0)==4){r=(Rc(k)|0|s|0)==0;t=r?-2:j}else if((g|0)==1){o=13;break}else if((g|0)==2)break;else if((g|0)==5){u=-4;break a}else t=j;if(!s){u=t;break a}m=c[a>>2]|0;j=t;n=s;h=q}if((o|0)==8){c[a>>2]=1;c[d>>2]=h+(c[f>>2]|0)}else if((o|0)==13){n=a+4|0;c[n>>2]=(c[n>>2]|0)+1;u=(s|0)==0?2:3;break}n=a+1288|0;if((c[n>>2]|0)!=0?(c[a+1244>>2]|0)!=(c[a+1248>>2]|0):0){c[n>>2]=0;c[a>>2]=2;u=3}else u=4}else u=-3;else u=-1;while(0);i=e;return u|0}function _c(a){a=a|0;c[a>>2]=2;c[a+4>>2]=3;return}function $c(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;i=i+16|0;f=e+8|0;g=e+4|0;h=e;if((a|0)==0|(b|0)==0){j=-1;i=e;return j|0}k=a+8|0;if(d)Qc(k);d=Nc(k,h,g,f)|0;if(!d){j=0;i=e;return j|0}c[b>>2]=d;c[b+4>>2]=c[h>>2];c[b+8>>2]=c[g>>2];c[b+12>>2]=c[f>>2];j=2;i=e;return j|0}function ad(a){a=a|0;var b=0,d=0;b=i;d=md(a)|0;c[1792]=d;c[1791]=d;c[1790]=a;c[1793]=d+a;i=b;return d|0}function bd(a){a=a|0;c[1790]=a;return}function cd(){var a=0;a=i;c[1786]=c[1791];c[1787]=c[1790];do ed()|0;while((c[1787]|0)!=0);i=a;return}function dd(){var a=0,b=0;a=i;if(Xc(7176,0)|0){da(7280)|0;b=c[1784]|0;if(b)nd(b)}else{c[1796]=1;c[1798]=1}i=a;return -1}function ed(){var a=0,b=0,d=0,e=0;a=i;c[1788]=c[1798];b=Zc(c[1794]|0,7144,7200)|0;switch(b|0){case 2:{c[1787]=0;break}case 4:{if(Yc(c[1794]|0,7208)|0){d=-1;i=a;return d|0}c[1814]=(Z((c[1803]|0)*3|0,c[1804]|0)|0)>>>1;ra();e=c[1800]|0;c[1787]=(c[1786]|0)-e+(c[1787]|0);c[1786]=e;d=0;i=a;return d|0}case 3:{e=c[1800]|0;c[1787]=(c[1786]|0)-e+(c[1787]|0);c[1786]=e;break}case 1:case -2:{c[1787]=0;d=b;i=a;return d|0}default:{d=b;i=a;return d|0}}c[1798]=(c[1798]|0)+1;if(($c(c[1794]|0,7264,0)|0)!=2){d=b;i=a;return d|0}do{c[1796]=(c[1796]|0)+1;ca(c[1816]|0,c[1803]|0,c[1804]|0)}while(($c(c[1794]|0,7264,0)|0)==2);d=b;i=a;return d|0}function fd(){var a=0,b=0;a=i;b=c[1784]|0;if(b)nd(b);i=a;return}function gd(){var a=0,b=0;a=i;i=i+16|0;b=a;_c(b);i=a;return c[b>>2]|0}function hd(){var a=0,b=0;a=i;i=i+16|0;b=a;_c(b);i=a;return c[b+4>>2]|0}function id(a){a=a|0;var b=0,c=0;b=i;c=md(a)|0;i=b;return c|0}function jd(a){a=a|0;var b=0;b=i;nd(a);i=b;return}function kd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;rd(a|0,b|0,c|0)|0;i=d;return}function ld(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;d=i;qd(a|0,b&255|0,c|0)|0;i=d;return}function md(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,la=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0;b=i;do if(a>>>0<245){if(a>>>0<11)d=16;else d=a+11&-8;e=d>>>3;f=c[1828]|0;g=f>>>e;if(g&3){h=(g&1^1)+e|0;j=h<<1;k=7352+(j<<2)|0;l=7352+(j+2<<2)|0;j=c[l>>2]|0;m=j+8|0;n=c[m>>2]|0;do if((k|0)!=(n|0)){if(n>>>0<(c[1832]|0)>>>0)ka();o=n+12|0;if((c[o>>2]|0)==(j|0)){c[o>>2]=k;c[l>>2]=n;break}else ka()}else c[1828]=f&~(1<<h);while(0);n=h<<3;c[j+4>>2]=n|3;l=j+(n|4)|0;c[l>>2]=c[l>>2]|1;p=m;i=b;return p|0}l=c[1830]|0;if(d>>>0>l>>>0){if(g){n=2<<e;k=g<<e&(n|0-n);n=(k&0-k)+-1|0;k=n>>>12&16;o=n>>>k;n=o>>>5&8;q=o>>>n;o=q>>>2&4;r=q>>>o;q=r>>>1&2;s=r>>>q;r=s>>>1&1;t=(n|k|o|q|r)+(s>>>r)|0;r=t<<1;s=7352+(r<<2)|0;q=7352+(r+2<<2)|0;r=c[q>>2]|0;o=r+8|0;k=c[o>>2]|0;do if((s|0)!=(k|0)){if(k>>>0<(c[1832]|0)>>>0)ka();n=k+12|0;if((c[n>>2]|0)==(r|0)){c[n>>2]=s;c[q>>2]=k;u=c[1830]|0;break}else ka()}else{c[1828]=f&~(1<<t);u=l}while(0);l=t<<3;f=l-d|0;c[r+4>>2]=d|3;k=r+d|0;c[r+(d|4)>>2]=f|1;c[r+l>>2]=f;if(u){l=c[1833]|0;q=u>>>3;s=q<<1;e=7352+(s<<2)|0;g=c[1828]|0;m=1<<q;if(g&m){q=7352+(s+2<<2)|0;j=c[q>>2]|0;if(j>>>0<(c[1832]|0)>>>0)ka();else{v=q;w=j}}else{c[1828]=g|m;v=7352+(s+2<<2)|0;w=e}c[v>>2]=l;c[w+12>>2]=l;c[l+8>>2]=w;c[l+12>>2]=e}c[1830]=f;c[1833]=k;p=o;i=b;return p|0}k=c[1829]|0;if(k){f=(k&0-k)+-1|0;k=f>>>12&16;e=f>>>k;f=e>>>5&8;l=e>>>f;e=l>>>2&4;s=l>>>e;l=s>>>1&2;m=s>>>l;s=m>>>1&1;g=c[7616+((f|k|e|l|s)+(m>>>s)<<2)>>2]|0;s=(c[g+4>>2]&-8)-d|0;m=g;l=g;while(1){g=c[m+16>>2]|0;if(!g){e=c[m+20>>2]|0;if(!e)break;else x=e}else x=g;g=(c[x+4>>2]&-8)-d|0;e=g>>>0<s>>>0;s=e?g:s;m=x;l=e?x:l}m=c[1832]|0;if(l>>>0<m>>>0)ka();o=l+d|0;if(l>>>0>=o>>>0)ka();r=c[l+24>>2]|0;t=c[l+12>>2]|0;do if((t|0)==(l|0)){e=l+20|0;g=c[e>>2]|0;if(!g){k=l+16|0;f=c[k>>2]|0;if(!f){y=0;break}else{z=f;A=k}}else{z=g;A=e}while(1){e=z+20|0;g=c[e>>2]|0;if(g){z=g;A=e;continue}e=z+16|0;g=c[e>>2]|0;if(!g)break;else{z=g;A=e}}if(A>>>0<m>>>0)ka();else{c[A>>2]=0;y=z;break}}else{e=c[l+8>>2]|0;if(e>>>0<m>>>0)ka();g=e+12|0;if((c[g>>2]|0)!=(l|0))ka();k=t+8|0;if((c[k>>2]|0)==(l|0)){c[g>>2]=t;c[k>>2]=e;y=t;break}else ka()}while(0);do if(r){t=c[l+28>>2]|0;m=7616+(t<<2)|0;if((l|0)==(c[m>>2]|0)){c[m>>2]=y;if(!y){c[1829]=c[1829]&~(1<<t);break}}else{if(r>>>0<(c[1832]|0)>>>0)ka();t=r+16|0;if((c[t>>2]|0)==(l|0))c[t>>2]=y;else c[r+20>>2]=y;if(!y)break}t=c[1832]|0;if(y>>>0<t>>>0)ka();c[y+24>>2]=r;m=c[l+16>>2]|0;do if(m)if(m>>>0<t>>>0)ka();else{c[y+16>>2]=m;c[m+24>>2]=y;break}while(0);m=c[l+20>>2]|0;if(m)if(m>>>0<(c[1832]|0)>>>0)ka();else{c[y+20>>2]=m;c[m+24>>2]=y;break}}while(0);if(s>>>0<16){r=s+d|0;c[l+4>>2]=r|3;m=l+(r+4)|0;c[m>>2]=c[m>>2]|1}else{c[l+4>>2]=d|3;c[l+(d|4)>>2]=s|1;c[l+(s+d)>>2]=s;m=c[1830]|0;if(m){r=c[1833]|0;t=m>>>3;m=t<<1;e=7352+(m<<2)|0;k=c[1828]|0;g=1<<t;if(k&g){t=7352+(m+2<<2)|0;f=c[t>>2]|0;if(f>>>0<(c[1832]|0)>>>0)ka();else{B=t;C=f}}else{c[1828]=k|g;B=7352+(m+2<<2)|0;C=e}c[B>>2]=r;c[C+12>>2]=r;c[r+8>>2]=C;c[r+12>>2]=e}c[1830]=s;c[1833]=o}p=l+8|0;i=b;return p|0}else D=d}else D=d}else if(a>>>0<=4294967231){e=a+11|0;r=e&-8;m=c[1829]|0;if(m){g=0-r|0;k=e>>>8;if(k)if(r>>>0>16777215)E=31;else{e=(k+1048320|0)>>>16&8;f=k<<e;k=(f+520192|0)>>>16&4;t=f<<k;f=(t+245760|0)>>>16&2;j=14-(k|e|f)+(t<<f>>>15)|0;E=r>>>(j+7|0)&1|j<<1}else E=0;j=c[7616+(E<<2)>>2]|0;a:do if(!j){F=g;G=0;H=0}else{if((E|0)==31)I=0;else I=25-(E>>>1)|0;f=g;t=0;e=r<<I;k=j;q=0;while(1){h=c[k+4>>2]&-8;n=h-r|0;if(n>>>0<f>>>0)if((h|0)==(r|0)){F=n;G=k;H=k;break a}else{J=n;K=k}else{J=f;K=q}n=c[k+20>>2]|0;k=c[k+(e>>>31<<2)+16>>2]|0;h=(n|0)==0|(n|0)==(k|0)?t:n;if(!k){F=J;G=h;H=K;break}else{f=J;t=h;e=e<<1;q=K}}}while(0);if((G|0)==0&(H|0)==0){j=2<<E;g=m&(j|0-j);if(!g){D=r;break}j=(g&0-g)+-1|0;g=j>>>12&16;l=j>>>g;j=l>>>5&8;o=l>>>j;l=o>>>2&4;s=o>>>l;o=s>>>1&2;q=s>>>o;s=q>>>1&1;L=c[7616+((j|g|l|o|s)+(q>>>s)<<2)>>2]|0}else L=G;if(!L){M=F;N=H}else{s=F;q=L;o=H;while(1){l=(c[q+4>>2]&-8)-r|0;g=l>>>0<s>>>0;j=g?l:s;l=g?q:o;g=c[q+16>>2]|0;if(g){s=j;q=g;o=l;continue}q=c[q+20>>2]|0;if(!q){M=j;N=l;break}else{s=j;o=l}}}if((N|0)!=0?M>>>0<((c[1830]|0)-r|0)>>>0:0){o=c[1832]|0;if(N>>>0<o>>>0)ka();s=N+r|0;if(N>>>0>=s>>>0)ka();q=c[N+24>>2]|0;m=c[N+12>>2]|0;do if((m|0)==(N|0)){l=N+20|0;j=c[l>>2]|0;if(!j){g=N+16|0;e=c[g>>2]|0;if(!e){O=0;break}else{P=e;Q=g}}else{P=j;Q=l}while(1){l=P+20|0;j=c[l>>2]|0;if(j){P=j;Q=l;continue}l=P+16|0;j=c[l>>2]|0;if(!j)break;else{P=j;Q=l}}if(Q>>>0<o>>>0)ka();else{c[Q>>2]=0;O=P;break}}else{l=c[N+8>>2]|0;if(l>>>0<o>>>0)ka();j=l+12|0;if((c[j>>2]|0)!=(N|0))ka();g=m+8|0;if((c[g>>2]|0)==(N|0)){c[j>>2]=m;c[g>>2]=l;O=m;break}else ka()}while(0);do if(q){m=c[N+28>>2]|0;o=7616+(m<<2)|0;if((N|0)==(c[o>>2]|0)){c[o>>2]=O;if(!O){c[1829]=c[1829]&~(1<<m);break}}else{if(q>>>0<(c[1832]|0)>>>0)ka();m=q+16|0;if((c[m>>2]|0)==(N|0))c[m>>2]=O;else c[q+20>>2]=O;if(!O)break}m=c[1832]|0;if(O>>>0<m>>>0)ka();c[O+24>>2]=q;o=c[N+16>>2]|0;do if(o)if(o>>>0<m>>>0)ka();else{c[O+16>>2]=o;c[o+24>>2]=O;break}while(0);o=c[N+20>>2]|0;if(o)if(o>>>0<(c[1832]|0)>>>0)ka();else{c[O+20>>2]=o;c[o+24>>2]=O;break}}while(0);b:do if(M>>>0>=16){c[N+4>>2]=r|3;c[N+(r|4)>>2]=M|1;c[N+(M+r)>>2]=M;q=M>>>3;if(M>>>0<256){o=q<<1;m=7352+(o<<2)|0;l=c[1828]|0;g=1<<q;do if(!(l&g)){c[1828]=l|g;R=7352+(o+2<<2)|0;S=m}else{q=7352+(o+2<<2)|0;j=c[q>>2]|0;if(j>>>0>=(c[1832]|0)>>>0){R=q;S=j;break}ka()}while(0);c[R>>2]=s;c[S+12>>2]=s;c[N+(r+8)>>2]=S;c[N+(r+12)>>2]=m;break}o=M>>>8;if(o)if(M>>>0>16777215)T=31;else{g=(o+1048320|0)>>>16&8;l=o<<g;o=(l+520192|0)>>>16&4;j=l<<o;l=(j+245760|0)>>>16&2;q=14-(o|g|l)+(j<<l>>>15)|0;T=M>>>(q+7|0)&1|q<<1}else T=0;q=7616+(T<<2)|0;c[N+(r+28)>>2]=T;c[N+(r+20)>>2]=0;c[N+(r+16)>>2]=0;l=c[1829]|0;j=1<<T;if(!(l&j)){c[1829]=l|j;c[q>>2]=s;c[N+(r+24)>>2]=q;c[N+(r+12)>>2]=s;c[N+(r+8)>>2]=s;break}j=c[q>>2]|0;if((T|0)==31)U=0;else U=25-(T>>>1)|0;c:do if((c[j+4>>2]&-8|0)!=(M|0)){q=M<<U;l=j;while(1){V=l+(q>>>31<<2)+16|0;g=c[V>>2]|0;if(!g)break;if((c[g+4>>2]&-8|0)==(M|0)){W=g;break c}else{q=q<<1;l=g}}if(V>>>0<(c[1832]|0)>>>0)ka();else{c[V>>2]=s;c[N+(r+24)>>2]=l;c[N+(r+12)>>2]=s;c[N+(r+8)>>2]=s;break b}}else W=j;while(0);j=W+8|0;m=c[j>>2]|0;q=c[1832]|0;if(W>>>0>=q>>>0&m>>>0>=q>>>0){c[m+12>>2]=s;c[j>>2]=s;c[N+(r+8)>>2]=m;c[N+(r+12)>>2]=W;c[N+(r+24)>>2]=0;break}else ka()}else{m=M+r|0;c[N+4>>2]=m|3;j=N+(m+4)|0;c[j>>2]=c[j>>2]|1}while(0);p=N+8|0;i=b;return p|0}else D=r}else D=r}else D=-1;while(0);N=c[1830]|0;if(N>>>0>=D>>>0){M=N-D|0;W=c[1833]|0;if(M>>>0>15){c[1833]=W+D;c[1830]=M;c[W+(D+4)>>2]=M|1;c[W+N>>2]=M;c[W+4>>2]=D|3}else{c[1830]=0;c[1833]=0;c[W+4>>2]=N|3;M=W+(N+4)|0;c[M>>2]=c[M>>2]|1}p=W+8|0;i=b;return p|0}W=c[1831]|0;if(W>>>0>D>>>0){M=W-D|0;c[1831]=M;W=c[1834]|0;c[1834]=W+D;c[W+(D+4)>>2]=M|1;c[W+4>>2]=D|3;p=W+8|0;i=b;return p|0}do if(!(c[1946]|0)){W=ua(30)|0;if(!(W+-1&W)){c[1948]=W;c[1947]=W;c[1949]=-1;c[1950]=-1;c[1951]=0;c[1939]=0;c[1946]=(ta(0)|0)&-16^1431655768;break}else ka()}while(0);W=D+48|0;M=c[1948]|0;N=D+47|0;V=M+N|0;U=0-M|0;M=V&U;if(M>>>0<=D>>>0){p=0;i=b;return p|0}T=c[1938]|0;if((T|0)!=0?(S=c[1936]|0,R=S+M|0,R>>>0<=S>>>0|R>>>0>T>>>0):0){p=0;i=b;return p|0}d:do if(!(c[1939]&4)){T=c[1834]|0;e:do if(T){R=7760|0;while(1){S=c[R>>2]|0;if(S>>>0<=T>>>0?(X=R+4|0,(S+(c[X>>2]|0)|0)>>>0>T>>>0):0)break;S=c[R+8>>2]|0;if(!S){Y=181;break e}else R=S}if(R){S=V-(c[1831]|0)&U;if(S>>>0<2147483647){O=ma(S|0)|0;if((O|0)==((c[R>>2]|0)+(c[X>>2]|0)|0)){Z=O;_=S;Y=190}else{$=O;aa=S;Y=191}}else ba=0}else Y=181}else Y=181;while(0);do if((Y|0)==181){T=ma(0)|0;if((T|0)!=(-1|0)){r=T;S=c[1947]|0;O=S+-1|0;if(!(O&r))ca=M;else ca=M-r+(O+r&0-S)|0;S=c[1936]|0;r=S+ca|0;if(ca>>>0>D>>>0&ca>>>0<2147483647){O=c[1938]|0;if((O|0)!=0?r>>>0<=S>>>0|r>>>0>O>>>0:0){ba=0;break}O=ma(ca|0)|0;if((O|0)==(T|0)){Z=T;_=ca;Y=190}else{$=O;aa=ca;Y=191}}else ba=0}else ba=0}while(0);f:do if((Y|0)==190)if((Z|0)==(-1|0))ba=_;else{da=Z;ea=_;Y=201;break d}else if((Y|0)==191){O=0-aa|0;do if(($|0)!=(-1|0)&aa>>>0<2147483647&W>>>0>aa>>>0?(T=c[1948]|0,r=N-aa+T&0-T,r>>>0<2147483647):0)if((ma(r|0)|0)==(-1|0)){ma(O|0)|0;ba=0;break f}else{fa=r+aa|0;break}else fa=aa;while(0);if(($|0)==(-1|0))ba=0;else{da=$;ea=fa;Y=201;break d}}while(0);c[1939]=c[1939]|4;ga=ba;Y=198}else{ga=0;Y=198}while(0);if((((Y|0)==198?M>>>0<2147483647:0)?(ba=ma(M|0)|0,M=ma(0)|0,(ba|0)!=(-1|0)&(M|0)!=(-1|0)&ba>>>0<M>>>0):0)?(fa=M-ba|0,M=fa>>>0>(D+40|0)>>>0,M):0){da=ba;ea=M?fa:ga;Y=201}if((Y|0)==201){ga=(c[1936]|0)+ea|0;c[1936]=ga;if(ga>>>0>(c[1937]|0)>>>0)c[1937]=ga;ga=c[1834]|0;g:do if(ga){fa=7760|0;while(1){ha=c[fa>>2]|0;ia=fa+4|0;ja=c[ia>>2]|0;if((da|0)==(ha+ja|0)){Y=213;break}M=c[fa+8>>2]|0;if(!M)break;else fa=M}if(((Y|0)==213?(c[fa+12>>2]&8|0)==0:0)?ga>>>0>=ha>>>0&ga>>>0<da>>>0:0){c[ia>>2]=ja+ea;M=(c[1831]|0)+ea|0;ba=ga+8|0;if(!(ba&7))la=0;else la=0-ba&7;ba=M-la|0;c[1834]=ga+la;c[1831]=ba;c[ga+(la+4)>>2]=ba|1;c[ga+(M+4)>>2]=40;c[1835]=c[1950];break}M=c[1832]|0;if(da>>>0<M>>>0){c[1832]=da;na=da}else na=M;M=da+ea|0;ba=7760|0;while(1){if((c[ba>>2]|0)==(M|0)){Y=223;break}$=c[ba+8>>2]|0;if(!$)break;else ba=$}if((Y|0)==223?(c[ba+12>>2]&8|0)==0:0){c[ba>>2]=da;M=ba+4|0;c[M>>2]=(c[M>>2]|0)+ea;M=da+8|0;if(!(M&7))oa=0;else oa=0-M&7;M=da+(ea+8)|0;if(!(M&7))pa=0;else pa=0-M&7;M=da+(pa+ea)|0;fa=oa+D|0;$=da+fa|0;aa=M-(da+oa)-D|0;c[da+(oa+4)>>2]=D|3;h:do if((M|0)!=(ga|0)){if((M|0)==(c[1833]|0)){N=(c[1830]|0)+aa|0;c[1830]=N;c[1833]=$;c[da+(fa+4)>>2]=N|1;c[da+(N+fa)>>2]=N;break}N=ea+4|0;W=c[da+(N+pa)>>2]|0;if((W&3|0)==1){_=W&-8;Z=W>>>3;i:do if(W>>>0>=256){ca=c[da+((pa|24)+ea)>>2]|0;X=c[da+(ea+12+pa)>>2]|0;do if((X|0)==(M|0)){U=pa|16;V=da+(N+U)|0;O=c[V>>2]|0;if(!O){R=da+(U+ea)|0;U=c[R>>2]|0;if(!U){qa=0;break}else{ra=U;sa=R}}else{ra=O;sa=V}while(1){V=ra+20|0;O=c[V>>2]|0;if(O){ra=O;sa=V;continue}V=ra+16|0;O=c[V>>2]|0;if(!O)break;else{ra=O;sa=V}}if(sa>>>0<na>>>0)ka();else{c[sa>>2]=0;qa=ra;break}}else{V=c[da+((pa|8)+ea)>>2]|0;if(V>>>0<na>>>0)ka();O=V+12|0;if((c[O>>2]|0)!=(M|0))ka();R=X+8|0;if((c[R>>2]|0)==(M|0)){c[O>>2]=X;c[R>>2]=V;qa=X;break}else ka()}while(0);if(!ca)break;X=c[da+(ea+28+pa)>>2]|0;l=7616+(X<<2)|0;do if((M|0)!=(c[l>>2]|0)){if(ca>>>0<(c[1832]|0)>>>0)ka();V=ca+16|0;if((c[V>>2]|0)==(M|0))c[V>>2]=qa;else c[ca+20>>2]=qa;if(!qa)break i}else{c[l>>2]=qa;if(qa)break;c[1829]=c[1829]&~(1<<X);break i}while(0);X=c[1832]|0;if(qa>>>0<X>>>0)ka();c[qa+24>>2]=ca;l=pa|16;V=c[da+(l+ea)>>2]|0;do if(V)if(V>>>0<X>>>0)ka();else{c[qa+16>>2]=V;c[V+24>>2]=qa;break}while(0);V=c[da+(N+l)>>2]|0;if(!V)break;if(V>>>0<(c[1832]|0)>>>0)ka();else{c[qa+20>>2]=V;c[V+24>>2]=qa;break}}else{V=c[da+((pa|8)+ea)>>2]|0;X=c[da+(ea+12+pa)>>2]|0;ca=7352+(Z<<1<<2)|0;do if((V|0)!=(ca|0)){if(V>>>0<na>>>0)ka();if((c[V+12>>2]|0)==(M|0))break;ka()}while(0);if((X|0)==(V|0)){c[1828]=c[1828]&~(1<<Z);break}do if((X|0)==(ca|0))wa=X+8|0;else{if(X>>>0<na>>>0)ka();l=X+8|0;if((c[l>>2]|0)==(M|0)){wa=l;break}ka()}while(0);c[V+12>>2]=X;c[wa>>2]=V}while(0);xa=da+((_|pa)+ea)|0;ya=_+aa|0}else{xa=M;ya=aa}Z=xa+4|0;c[Z>>2]=c[Z>>2]&-2;c[da+(fa+4)>>2]=ya|1;c[da+(ya+fa)>>2]=ya;Z=ya>>>3;if(ya>>>0<256){N=Z<<1;W=7352+(N<<2)|0;ca=c[1828]|0;l=1<<Z;do if(!(ca&l)){c[1828]=ca|l;za=7352+(N+2<<2)|0;Aa=W}else{Z=7352+(N+2<<2)|0;R=c[Z>>2]|0;if(R>>>0>=(c[1832]|0)>>>0){za=Z;Aa=R;break}ka()}while(0);c[za>>2]=$;c[Aa+12>>2]=$;c[da+(fa+8)>>2]=Aa;c[da+(fa+12)>>2]=W;break}N=ya>>>8;do if(!N)Ba=0;else{if(ya>>>0>16777215){Ba=31;break}l=(N+1048320|0)>>>16&8;ca=N<<l;_=(ca+520192|0)>>>16&4;R=ca<<_;ca=(R+245760|0)>>>16&2;Z=14-(_|l|ca)+(R<<ca>>>15)|0;Ba=ya>>>(Z+7|0)&1|Z<<1}while(0);N=7616+(Ba<<2)|0;c[da+(fa+28)>>2]=Ba;c[da+(fa+20)>>2]=0;c[da+(fa+16)>>2]=0;W=c[1829]|0;Z=1<<Ba;if(!(W&Z)){c[1829]=W|Z;c[N>>2]=$;c[da+(fa+24)>>2]=N;c[da+(fa+12)>>2]=$;c[da+(fa+8)>>2]=$;break}Z=c[N>>2]|0;if((Ba|0)==31)Ca=0;else Ca=25-(Ba>>>1)|0;j:do if((c[Z+4>>2]&-8|0)!=(ya|0)){N=ya<<Ca;W=Z;while(1){Da=W+(N>>>31<<2)+16|0;ca=c[Da>>2]|0;if(!ca)break;if((c[ca+4>>2]&-8|0)==(ya|0)){Ea=ca;break j}else{N=N<<1;W=ca}}if(Da>>>0<(c[1832]|0)>>>0)ka();else{c[Da>>2]=$;c[da+(fa+24)>>2]=W;c[da+(fa+12)>>2]=$;c[da+(fa+8)>>2]=$;break h}}else Ea=Z;while(0);Z=Ea+8|0;N=c[Z>>2]|0;V=c[1832]|0;if(Ea>>>0>=V>>>0&N>>>0>=V>>>0){c[N+12>>2]=$;c[Z>>2]=$;c[da+(fa+8)>>2]=N;c[da+(fa+12)>>2]=Ea;c[da+(fa+24)>>2]=0;break}else ka()}else{N=(c[1831]|0)+aa|0;c[1831]=N;c[1834]=$;c[da+(fa+4)>>2]=N|1}while(0);p=da+(oa|8)|0;i=b;return p|0}fa=7760|0;while(1){Fa=c[fa>>2]|0;if(Fa>>>0<=ga>>>0?(Ga=c[fa+4>>2]|0,Ha=Fa+Ga|0,Ha>>>0>ga>>>0):0)break;fa=c[fa+8>>2]|0}fa=Fa+(Ga+-39)|0;if(!(fa&7))Ia=0;else Ia=0-fa&7;fa=Fa+(Ga+-47+Ia)|0;$=fa>>>0<(ga+16|0)>>>0?ga:fa;fa=$+8|0;aa=da+8|0;if(!(aa&7))Ja=0;else Ja=0-aa&7;aa=ea+-40-Ja|0;c[1834]=da+Ja;c[1831]=aa;c[da+(Ja+4)>>2]=aa|1;c[da+(ea+-36)>>2]=40;c[1835]=c[1950];c[$+4>>2]=27;c[fa+0>>2]=c[1940];c[fa+4>>2]=c[1941];c[fa+8>>2]=c[1942];c[fa+12>>2]=c[1943];c[1940]=da;c[1941]=ea;c[1943]=0;c[1942]=fa;fa=$+28|0;c[fa>>2]=7;if(($+32|0)>>>0<Ha>>>0){aa=fa;do{fa=aa;aa=aa+4|0;c[aa>>2]=7}while((fa+8|0)>>>0<Ha>>>0)}if(($|0)!=(ga|0)){aa=$-ga|0;fa=ga+(aa+4)|0;c[fa>>2]=c[fa>>2]&-2;c[ga+4>>2]=aa|1;c[ga+aa>>2]=aa;fa=aa>>>3;if(aa>>>0<256){M=fa<<1;ba=7352+(M<<2)|0;N=c[1828]|0;Z=1<<fa;do if(!(N&Z)){c[1828]=N|Z;Ka=7352+(M+2<<2)|0;La=ba}else{fa=7352+(M+2<<2)|0;V=c[fa>>2]|0;if(V>>>0>=(c[1832]|0)>>>0){Ka=fa;La=V;break}ka()}while(0);c[Ka>>2]=ga;c[La+12>>2]=ga;c[ga+8>>2]=La;c[ga+12>>2]=ba;break}M=aa>>>8;if(M)if(aa>>>0>16777215)Ma=31;else{Z=(M+1048320|0)>>>16&8;N=M<<Z;M=(N+520192|0)>>>16&4;$=N<<M;N=($+245760|0)>>>16&2;V=14-(M|Z|N)+($<<N>>>15)|0;Ma=aa>>>(V+7|0)&1|V<<1}else Ma=0;V=7616+(Ma<<2)|0;c[ga+28>>2]=Ma;c[ga+20>>2]=0;c[ga+16>>2]=0;N=c[1829]|0;$=1<<Ma;if(!(N&$)){c[1829]=N|$;c[V>>2]=ga;c[ga+24>>2]=V;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break}$=c[V>>2]|0;if((Ma|0)==31)Na=0;else Na=25-(Ma>>>1)|0;k:do if((c[$+4>>2]&-8|0)!=(aa|0)){V=aa<<Na;N=$;while(1){Oa=N+(V>>>31<<2)+16|0;Z=c[Oa>>2]|0;if(!Z)break;if((c[Z+4>>2]&-8|0)==(aa|0)){Pa=Z;break k}else{V=V<<1;N=Z}}if(Oa>>>0<(c[1832]|0)>>>0)ka();else{c[Oa>>2]=ga;c[ga+24>>2]=N;c[ga+12>>2]=ga;c[ga+8>>2]=ga;break g}}else Pa=$;while(0);$=Pa+8|0;aa=c[$>>2]|0;ba=c[1832]|0;if(Pa>>>0>=ba>>>0&aa>>>0>=ba>>>0){c[aa+12>>2]=ga;c[$>>2]=ga;c[ga+8>>2]=aa;c[ga+12>>2]=Pa;c[ga+24>>2]=0;break}else ka()}}else{aa=c[1832]|0;if((aa|0)==0|da>>>0<aa>>>0)c[1832]=da;c[1940]=da;c[1941]=ea;c[1943]=0;c[1837]=c[1946];c[1836]=-1;aa=0;do{$=aa<<1;ba=7352+($<<2)|0;c[7352+($+3<<2)>>2]=ba;c[7352+($+2<<2)>>2]=ba;aa=aa+1|0}while((aa|0)!=32);aa=da+8|0;if(!(aa&7))Qa=0;else Qa=0-aa&7;aa=ea+-40-Qa|0;c[1834]=da+Qa;c[1831]=aa;c[da+(Qa+4)>>2]=aa|1;c[da+(ea+-36)>>2]=40;c[1835]=c[1950]}while(0);ea=c[1831]|0;if(ea>>>0>D>>>0){da=ea-D|0;c[1831]=da;ea=c[1834]|0;c[1834]=ea+D;c[ea+(D+4)>>2]=da|1;c[ea+4>>2]=D|3;p=ea+8|0;i=b;return p|0}}c[(va()|0)>>2]=12;p=0;i=b;return p|0}function nd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;b=i;if(!a){i=b;return}d=a+-8|0;e=c[1832]|0;if(d>>>0<e>>>0)ka();f=c[a+-4>>2]|0;g=f&3;if((g|0)==1)ka();h=f&-8;j=a+(h+-8)|0;do if(!(f&1)){k=c[d>>2]|0;if(!g){i=b;return}l=-8-k|0;m=a+l|0;n=k+h|0;if(m>>>0<e>>>0)ka();if((m|0)==(c[1833]|0)){o=a+(h+-4)|0;p=c[o>>2]|0;if((p&3|0)!=3){q=m;r=n;break}c[1830]=n;c[o>>2]=p&-2;c[a+(l+4)>>2]=n|1;c[j>>2]=n;i=b;return}p=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;o=c[a+(l+12)>>2]|0;s=7352+(p<<1<<2)|0;if((k|0)!=(s|0)){if(k>>>0<e>>>0)ka();if((c[k+12>>2]|0)!=(m|0))ka()}if((o|0)==(k|0)){c[1828]=c[1828]&~(1<<p);q=m;r=n;break}if((o|0)!=(s|0)){if(o>>>0<e>>>0)ka();s=o+8|0;if((c[s>>2]|0)==(m|0))t=s;else ka()}else t=o+8|0;c[k+12>>2]=o;c[t>>2]=k;q=m;r=n;break}k=c[a+(l+24)>>2]|0;o=c[a+(l+12)>>2]|0;do if((o|0)==(m|0)){s=a+(l+20)|0;p=c[s>>2]|0;if(!p){u=a+(l+16)|0;v=c[u>>2]|0;if(!v){w=0;break}else{x=v;y=u}}else{x=p;y=s}while(1){s=x+20|0;p=c[s>>2]|0;if(p){x=p;y=s;continue}s=x+16|0;p=c[s>>2]|0;if(!p)break;else{x=p;y=s}}if(y>>>0<e>>>0)ka();else{c[y>>2]=0;w=x;break}}else{s=c[a+(l+8)>>2]|0;if(s>>>0<e>>>0)ka();p=s+12|0;if((c[p>>2]|0)!=(m|0))ka();u=o+8|0;if((c[u>>2]|0)==(m|0)){c[p>>2]=o;c[u>>2]=s;w=o;break}else ka()}while(0);if(k){o=c[a+(l+28)>>2]|0;s=7616+(o<<2)|0;if((m|0)==(c[s>>2]|0)){c[s>>2]=w;if(!w){c[1829]=c[1829]&~(1<<o);q=m;r=n;break}}else{if(k>>>0<(c[1832]|0)>>>0)ka();o=k+16|0;if((c[o>>2]|0)==(m|0))c[o>>2]=w;else c[k+20>>2]=w;if(!w){q=m;r=n;break}}o=c[1832]|0;if(w>>>0<o>>>0)ka();c[w+24>>2]=k;s=c[a+(l+16)>>2]|0;do if(s)if(s>>>0<o>>>0)ka();else{c[w+16>>2]=s;c[s+24>>2]=w;break}while(0);s=c[a+(l+20)>>2]|0;if(s)if(s>>>0<(c[1832]|0)>>>0)ka();else{c[w+20>>2]=s;c[s+24>>2]=w;q=m;r=n;break}else{q=m;r=n}}else{q=m;r=n}}else{q=d;r=h}while(0);if(q>>>0>=j>>>0)ka();d=a+(h+-4)|0;w=c[d>>2]|0;if(!(w&1))ka();if(!(w&2)){if((j|0)==(c[1834]|0)){e=(c[1831]|0)+r|0;c[1831]=e;c[1834]=q;c[q+4>>2]=e|1;if((q|0)!=(c[1833]|0)){i=b;return}c[1833]=0;c[1830]=0;i=b;return}if((j|0)==(c[1833]|0)){e=(c[1830]|0)+r|0;c[1830]=e;c[1833]=q;c[q+4>>2]=e|1;c[q+e>>2]=e;i=b;return}e=(w&-8)+r|0;x=w>>>3;do if(w>>>0>=256){y=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do if((t|0)==(j|0)){g=a+(h+12)|0;f=c[g>>2]|0;if(!f){s=a+(h+8)|0;o=c[s>>2]|0;if(!o){z=0;break}else{A=o;B=s}}else{A=f;B=g}while(1){g=A+20|0;f=c[g>>2]|0;if(f){A=f;B=g;continue}g=A+16|0;f=c[g>>2]|0;if(!f)break;else{A=f;B=g}}if(B>>>0<(c[1832]|0)>>>0)ka();else{c[B>>2]=0;z=A;break}}else{g=c[a+h>>2]|0;if(g>>>0<(c[1832]|0)>>>0)ka();f=g+12|0;if((c[f>>2]|0)!=(j|0))ka();s=t+8|0;if((c[s>>2]|0)==(j|0)){c[f>>2]=t;c[s>>2]=g;z=t;break}else ka()}while(0);if(y){t=c[a+(h+20)>>2]|0;n=7616+(t<<2)|0;if((j|0)==(c[n>>2]|0)){c[n>>2]=z;if(!z){c[1829]=c[1829]&~(1<<t);break}}else{if(y>>>0<(c[1832]|0)>>>0)ka();t=y+16|0;if((c[t>>2]|0)==(j|0))c[t>>2]=z;else c[y+20>>2]=z;if(!z)break}t=c[1832]|0;if(z>>>0<t>>>0)ka();c[z+24>>2]=y;n=c[a+(h+8)>>2]|0;do if(n)if(n>>>0<t>>>0)ka();else{c[z+16>>2]=n;c[n+24>>2]=z;break}while(0);n=c[a+(h+12)>>2]|0;if(n)if(n>>>0<(c[1832]|0)>>>0)ka();else{c[z+20>>2]=n;c[n+24>>2]=z;break}}}else{n=c[a+h>>2]|0;t=c[a+(h|4)>>2]|0;y=7352+(x<<1<<2)|0;if((n|0)!=(y|0)){if(n>>>0<(c[1832]|0)>>>0)ka();if((c[n+12>>2]|0)!=(j|0))ka()}if((t|0)==(n|0)){c[1828]=c[1828]&~(1<<x);break}if((t|0)!=(y|0)){if(t>>>0<(c[1832]|0)>>>0)ka();y=t+8|0;if((c[y>>2]|0)==(j|0))C=y;else ka()}else C=t+8|0;c[n+12>>2]=t;c[C>>2]=n}while(0);c[q+4>>2]=e|1;c[q+e>>2]=e;if((q|0)==(c[1833]|0)){c[1830]=e;i=b;return}else D=e}else{c[d>>2]=w&-2;c[q+4>>2]=r|1;c[q+r>>2]=r;D=r}r=D>>>3;if(D>>>0<256){w=r<<1;d=7352+(w<<2)|0;e=c[1828]|0;C=1<<r;if(e&C){r=7352+(w+2<<2)|0;j=c[r>>2]|0;if(j>>>0<(c[1832]|0)>>>0)ka();else{E=r;F=j}}else{c[1828]=e|C;E=7352+(w+2<<2)|0;F=d}c[E>>2]=q;c[F+12>>2]=q;c[q+8>>2]=F;c[q+12>>2]=d;i=b;return}d=D>>>8;if(d)if(D>>>0>16777215)G=31;else{F=(d+1048320|0)>>>16&8;E=d<<F;d=(E+520192|0)>>>16&4;w=E<<d;E=(w+245760|0)>>>16&2;C=14-(d|F|E)+(w<<E>>>15)|0;G=D>>>(C+7|0)&1|C<<1}else G=0;C=7616+(G<<2)|0;c[q+28>>2]=G;c[q+20>>2]=0;c[q+16>>2]=0;E=c[1829]|0;w=1<<G;a:do if(E&w){F=c[C>>2]|0;if((G|0)==31)H=0;else H=25-(G>>>1)|0;b:do if((c[F+4>>2]&-8|0)!=(D|0)){d=D<<H;e=F;while(1){I=e+(d>>>31<<2)+16|0;j=c[I>>2]|0;if(!j)break;if((c[j+4>>2]&-8|0)==(D|0)){J=j;break b}else{d=d<<1;e=j}}if(I>>>0<(c[1832]|0)>>>0)ka();else{c[I>>2]=q;c[q+24>>2]=e;c[q+12>>2]=q;c[q+8>>2]=q;break a}}else J=F;while(0);F=J+8|0;d=c[F>>2]|0;j=c[1832]|0;if(J>>>0>=j>>>0&d>>>0>=j>>>0){c[d+12>>2]=q;c[F>>2]=q;c[q+8>>2]=d;c[q+12>>2]=J;c[q+24>>2]=0;break}else ka()}else{c[1829]=E|w;c[C>>2]=q;c[q+24>>2]=C;c[q+12>>2]=q;c[q+8>>2]=q}while(0);q=(c[1836]|0)+-1|0;c[1836]=q;if(!q)K=7768|0;else{i=b;return}while(1){q=c[K>>2]|0;if(!q)break;else K=q+8|0}c[1836]=-1;i=b;return}function od(){}function pd(b){b=b|0;var c=0;c=b;while(a[c>>0]|0)c=c+1|0;return c-b|0}function qd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b>>0]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b>>0]=d;b=b+1|0}return b-e|0}function rd(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return pa(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if(!e)return f|0;a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function sd(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;xa[a&3](b|0,c|0,d|0,e|0,f|0)}function td(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;_(0)}

// EMSCRIPTEN_END_FUNCS
var xa=[td,hc,gc,td];return{_strlen:pd,_free:nd,_broadwayGetMajorVersion:gd,_get_h264bsdClip:Mb,_broadwayExit:fd,_memset:qd,_broadwayCreateStream:ad,_malloc:md,_memcpy:rd,_broadwayGetMinorVersion:hd,_broadwayPlayStream:cd,_broadwaySetStreamLength:bd,_broadwayInit:dd,runPostSets:od,stackAlloc:ya,stackSave:za,stackRestore:Aa,setThrew:Ba,setTempRet0:Ea,getTempRet0:Fa,dynCall_viiiii:sd}})


// EMSCRIPTEN_END_ASM
(p.Xc,p.Yc,Q),Bb=p._strlen=$._strlen,Ea=p._free=$._free;p._broadwayGetMajorVersion=$._broadwayGetMajorVersion;p._get_h264bsdClip=$._get_h264bsdClip;p._broadwayExit=$._broadwayExit;var Gb=p._memset=$._memset;p._broadwayCreateStream=$._broadwayCreateStream;var Ca=p._malloc=$._malloc,gc=p._memcpy=$._memcpy;
p._broadwayGetMinorVersion=$._broadwayGetMinorVersion;p._broadwayPlayStream=$._broadwayPlayStream;p._broadwaySetStreamLength=$._broadwaySetStreamLength;p._broadwayInit=$._broadwayInit;p.runPostSets=$.runPostSets;p.dynCall_viiiii=$.dynCall_viiiii;z.pb=$.stackAlloc;z.Tb=$.stackSave;z.Sb=$.stackRestore;z.Yd=$.setTempRet0;z.xd=$.getTempRet0;
if(T)if("function"===typeof p.locateFile?T=p.locateFile(T):p.memoryInitializerPrefixURL&&(T=p.memoryInitializerPrefixURL+T),t||da){var hc=p.readBinary(T);N.set(hc,Ia)}else Ya(),yb(T,function(a){N.set(a,Ia);Za()},function(){d("could not load memory initializer "+T)});function ia(a){this.name="ExitStatus";this.message="Program terminated with exit("+a+")";this.status=a}ia.prototype=Error();var ic,jc=k,Xa=function kc(){!p.calledRun&&lc&&mc();p.calledRun||(Xa=kc)};
p.callMain=p.ag=function(a){function b(){for(var a=0;3>a;a++)e.push(0)}w(0==S,"cannot call main when async dependencies remain! (listen on __ATMAIN__)");w(0==Oa.length,"cannot call main when preRun functions remain to be called");a=a||[];Sa||(Sa=i,Na(R));var c=a.length+1,e=[M(Va(p.thisProgram),"i8",0)];b();for(var f=0;f<c-1;f+=1)e.push(M(Va(a[f]),"i8",0)),b();e.push(0);e=M(e,"i32",0);ic=y;try{var h=p._main(c,e,0);nc(h)}catch(j){j instanceof ia||("SimulateInfiniteLoop"==j?p.noExitRuntime=i:(j&&("object"===
typeof j&&j.stack)&&p.fa("exception thrown: "+[j,j.stack]),d(j)))}finally{}};
function mc(a){function b(){if(!p.calledRun&&(p.calledRun=i,!H)){Sa||(Sa=i,Na(R));Na(Pa);ba&&jc!==k&&p.fa("pre-main prep time: "+(Date.now()-jc)+" ms");if(p.onRuntimeInitialized)p.onRuntimeInitialized();p._main&&lc&&p.callMain(a);if(p.postRun)for("function"==typeof p.postRun&&(p.postRun=[p.postRun]);p.postRun.length;)Ua(p.postRun.shift());Na(Ra)}}a=a||p.arguments;jc===k&&(jc=Date.now());if(!(0<S)){if(p.preRun)for("function"==typeof p.preRun&&(p.preRun=[p.preRun]);p.preRun.length;)Ta(p.preRun.shift());
Na(Oa);!(0<S)&&!p.calledRun&&(p.setStatus?(p.setStatus("Running..."),setTimeout(function(){setTimeout(function(){p.setStatus("")},1);b()},1)):b())}}p.run=p.Ng=mc;function nc(a){p.noExitRuntime||(H=i,y=ic,Na(Qa),t?(process.stdout.once("drain",function(){process.exit(a)}),console.log(" "),setTimeout(function(){process.exit(a)},500)):da&&"function"===typeof quit&&quit(a),d(new ia(a)))}p.exit=p.hg=nc;
function A(a){a&&(p.print(a),p.fa(a));H=i;d("abort() at "+Fa()+"\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.")}p.abort=p.abort=A;if(p.preInit)for("function"==typeof p.preInit&&(p.preInit=[p.preInit]);0<p.preInit.length;)p.preInit.pop()();var lc=m;p.noInitialRun&&(lc=m);mc();


    
    
    
    
    
    
    var resultModule = window.Module || this.Module;
    return resultModule;
  };
  
  var Broadway = function(parOptions){
    this.options = parOptions || {};
    
    var asmInstance;
    
    var Module = getModule(function () {

    }, function ($buffer, width, height) {
      var buffer = this.pictureBuffers[$buffer];
      if (!buffer) {
        buffer = this.pictureBuffers[$buffer] = toU8Array($buffer, (width * height * 3) / 2);
      };
      
      if (this.options.rgb){
        if (!asmInstance){
          asmInstance = getAsm(width, height);
        };
        asmInstance.inp.set(buffer);
        asmInstance.doit();

        var copyU8 = new Uint8Array(asmInstance.outSize);
        copyU8.set( asmInstance.out );
        this.onPictureDecoded(copyU8, width, height);
        return;
        
      };
      
      this.onPictureDecoded(buffer, width, height);
    }.bind(this));

    var HEAP8 = Module.HEAP8;
    var HEAPU8 = Module.HEAPU8;
    var HEAP16 = Module.HEAP16;
    var HEAP32 = Module.HEAP32;
    var _h264bsdClip = Module._get_h264bsdClip();

    
    var MAX_STREAM_BUFFER_LENGTH = 1024 * 1024;
  
    // from old constructor
    Module._broadwayInit();
    
    /**
   * Creates a typed array from a HEAP8 pointer. 
   */
    function toU8Array(ptr, length) {
      return HEAPU8.subarray(ptr, ptr + length);
    };
    this.streamBuffer = toU8Array(Module._broadwayCreateStream(MAX_STREAM_BUFFER_LENGTH), MAX_STREAM_BUFFER_LENGTH);
    this.pictureBuffers = {};
    
    this.onPictureDecoded = function (buffer, width, height) {
      
    };
    
    /**
     * Decodes a stream buffer. This may be one single (unframed) NAL unit without the
     * start code, or a sequence of NAL units with framing start code prefixes. This
     * function overwrites stream buffer allocated by the codec with the supplied buffer.
     */
    this.decode = function decode(buffer) {
      // console.info("Decoding: " + buffer.length);
      this.streamBuffer.set(buffer);
      Module._broadwaySetStreamLength(buffer.length);
      Module._broadwayPlayStream();
    };


    
    function patchOptimizations(config, patches) { 
      var scope = getGlobalScope();
      for (var name in patches) {
        var patch = patches[name];
        if (patch) {
          var option = config[name];
          if (!option) option = "original";
          console.info(name + ": " + option);
          assert (option in patch.options);
          var fn = patch.options[option].fn;
          if (fn) {
            scope[patch.original] = Module.patch(null, patch.name, fn);
            console.info("Patching: " + patch.name + ", with: " + option);
          }
        }
      }
    };
    
    var patches = {
      "filter": {
        name: "_h264bsdFilterPicture",
        display: "Filter Picture",
        original: "Original_h264bsdFilterPicture",
        options: {
          none: {display: "None", fn: function () {}},
          original: {display: "Original", fn: null},
        }
      },
      "filterHorLuma": {
        name: "_FilterHorLuma",
        display: "Filter Hor Luma",
        original: "OriginalFilterHorLuma",
        options: {
          none: {display: "None", fn: function () {}},
          original: {display: "Original", fn: null},
          optimized: {display: "Optimized", fn: OptimizedFilterHorLuma}
        }
      },
      "filterVerLumaEdge": {
        name: "_FilterVerLumaEdge",
        display: "Filter Ver Luma Edge",
        original: "OriginalFilterVerLumaEdge",
        options: {
          none: {display: "None", fn: function () {}},
          original: {display: "Original", fn: null},
          optimized: {display: "Optimized", fn: OptimizedFilterVerLumaEdge}
        }
      },
      "getBoundaryStrengthsA": {
        name: "_GetBoundaryStrengthsA",
        display: "Get Boundary Strengths",
        original: "OriginalGetBoundaryStrengthsA",
        options: {
          none: {display: "None", fn: function () {}},
          original: {display: "Original", fn: null},
          optimized: {display: "Optimized", fn: OptimizedGetBoundaryStrengthsA}
        }
      }
    };
    function getGlobalScope() {
      return function () { return this; }.call(null);
    };
    
    /* Optimizations */

    function clip(x, y, z) {
      return z < x ? x : (z > y ? y : z);
    }

    function OptimizedGetBoundaryStrengthsA($mb, $bS) {
      var $totalCoeff = $mb + 28;

      var tc0 = HEAP16[$totalCoeff + 0 >> 1];
      var tc1 = HEAP16[$totalCoeff + 2 >> 1];
      var tc2 = HEAP16[$totalCoeff + 4 >> 1];
      var tc3 = HEAP16[$totalCoeff + 6 >> 1];
      var tc4 = HEAP16[$totalCoeff + 8 >> 1];
      var tc5 = HEAP16[$totalCoeff + 10 >> 1];
      var tc6 = HEAP16[$totalCoeff + 12 >> 1];
      var tc7 = HEAP16[$totalCoeff + 14 >> 1];
      var tc8 = HEAP16[$totalCoeff + 16 >> 1];
      var tc9 = HEAP16[$totalCoeff + 18 >> 1];
      var tc10 = HEAP16[$totalCoeff + 20 >> 1];
      var tc11 = HEAP16[$totalCoeff + 22 >> 1];
      var tc12 = HEAP16[$totalCoeff + 24 >> 1];
      var tc13 = HEAP16[$totalCoeff + 26 >> 1];
      var tc14 = HEAP16[$totalCoeff + 28 >> 1];
      var tc15 = HEAP16[$totalCoeff + 30 >> 1];

      HEAP32[$bS + 32 >> 2] = tc2 || tc0 ? 2 : 0;
      HEAP32[$bS + 40 >> 2] = tc3 || tc1 ? 2 : 0;
      HEAP32[$bS + 48 >> 2] = tc6 || tc4 ? 2 : 0;
      HEAP32[$bS + 56 >> 2] = tc7 || tc5 ? 2 : 0;
      HEAP32[$bS + 64 >> 2] = tc8 || tc2 ? 2 : 0;
      HEAP32[$bS + 72 >> 2] = tc9 || tc3 ? 2 : 0;
      HEAP32[$bS + 80 >> 2] = tc12 || tc6 ? 2 : 0;
      HEAP32[$bS + 88 >> 2] = tc13 || tc7 ? 2 : 0;
      HEAP32[$bS + 96 >> 2] = tc10 || tc8 ? 2 : 0;
      HEAP32[$bS + 104 >> 2] = tc11 || tc9 ? 2 : 0;
      HEAP32[$bS + 112 >> 2] = tc14 || tc12 ? 2 : 0;
      HEAP32[$bS + 120 >> 2] = tc15 || tc13 ? 2 : 0;

      HEAP32[$bS + 12 >> 2] = tc1 || tc0 ? 2 : 0;
      HEAP32[$bS + 20 >> 2] = tc4 || tc1 ? 2 : 0;
      HEAP32[$bS + 28 >> 2] = tc5 || tc4 ? 2 : 0;
      HEAP32[$bS + 44 >> 2] = tc3 || tc2 ? 2 : 0;
      HEAP32[$bS + 52 >> 2] = tc6 || tc3 ? 2 : 0;
      HEAP32[$bS + 60 >> 2] = tc7 || tc6 ? 2 : 0;
      HEAP32[$bS + 76 >> 2] = tc9 || tc8 ? 2 : 0;
      HEAP32[$bS + 84 >> 2] = tc12 || tc9 ? 2 : 0;
      HEAP32[$bS + 92 >> 2] = tc13 || tc12 ? 2 : 0;
      HEAP32[$bS + 108 >> 2] = tc11 || tc10 ? 2 : 0;
      HEAP32[$bS + 116 >> 2] = tc14 || tc11 ? 2 : 0;
      HEAP32[$bS + 124 >> 2] = tc15 || tc14 ? 2 : 0;
    }

    function OptimizedFilterVerLumaEdge ($data, bS, $thresholds, imageWidth) {
      var delta, tc, tmp;
      var p0, q0, p1, q1, p2, q2;
      var tmpFlag;
      var $clp = _h264bsdClip + 512;
      var alpha = HEAP32[$thresholds + 4 >> 2];
      var beta = HEAP32[$thresholds + 8 >> 2];
      var val;

      if (bS < 4) {
        tmp = tc = HEAPU8[HEAP32[$thresholds >> 2] + (bS - 1)] & 255;
        for (var i = 4; i > 0; i--) {
          p1 = HEAPU8[$data + -2] & 255;
          p0 = HEAPU8[$data + -1] & 255;
          q0 = HEAPU8[$data] & 255;
          q1 = HEAPU8[$data + 1] & 255;
          if ((Math.abs(p0 - q0) < alpha) && (Math.abs(p1 - p0) < beta) && (Math.abs(q1 - q0) < beta)) {
            p2 = HEAPU8[$data - 3] & 255;
            if (Math.abs(p2 - p0) < beta) {
              val = (p2 + ((p0 + q0 + 1) >> 1) - (p1 << 1)) >> 1;
              HEAP8[$data - 2] = p1 + clip(-tc, tc, val);
              tmp++;
            }

            q2 = HEAPU8[$data + 2] & 255;
            if (Math.abs(q2 - q0) < beta) {
              val = (q2 + ((p0 + q0 + 1) >> 1) - (q1 << 1)) >> 1;
              HEAP8[$data + 1] = (q1 + clip(-tc, tc, val));
              tmp++;
            }

            val = ((((q0 - p0) << 2) + (p1 - q1) + 4) >> 3);
            delta = clip(-tmp, tmp, val);

            p0 = HEAPU8[$clp + (p0 + delta)] & 255;
            q0 = HEAPU8[$clp + (q0 - delta)] & 255;
            tmp = tc;
            HEAP8[$data - 1] = p0;
            HEAP8[$data] = q0;

            $data += imageWidth;
          }
        }
      } else {
        OriginalFilterVerLumaEdge($data, bS, $thresholds, imageWidth);
      }
    }

    /**
 * Filter all four successive horizontal 4-pixel luma edges. This can be done when bS is equal to all four edges.
 */
    function OptimizedFilterHorLuma ($data, bS, $thresholds, imageWidth) {
      var delta, tc, tmp;
      var p0, q0, p1, q1, p2, q2;
      var tmpFlag;
      var $clp = _h264bsdClip + 512;
      var alpha = HEAP32[$thresholds + 4 >> 2];
      var beta = HEAP32[$thresholds + 8 >> 2];
      var val;

      if (bS < 4) {
        tmp = tc = HEAPU8[HEAP32[$thresholds >> 2] + (bS - 1)] & 255;
        for (var i = 16; i > 0; i--) {
          p1 = HEAPU8[$data + (-imageWidth << 1)] & 255;
          p0 = HEAPU8[$data + -imageWidth] & 255;
          q0 = HEAPU8[$data] & 255;
          q1 = HEAPU8[$data + imageWidth] & 255;

          if ((Math.abs(p0 - q0) < alpha) && (Math.abs(p1 - p0) < beta) && (Math.abs(q1 - q0) < beta)) {
            p2 = HEAPU8[$data + (-imageWidth * 3)] & 255;
            if (Math.abs(p2 - p0) < beta) {
              val = (p2 + ((p0 + q0 + 1) >> 1) - (p1 << 1)) >> 1;
              HEAP8[$data + (-imageWidth << 1)] = p1 + clip(-tc, tc, val);
              tmp++;
            }

            q2 = HEAPU8[$data + (imageWidth << 2)] & 255;
            if (Math.abs(q2 - q0) < beta) {
              val = (q2 + ((p0 + q0 + 1) >> 1) - (q1 << 1)) >> 1;
              HEAP8[$data + imageWidth] = (q1 + clip(-tc, tc, val));
              tmp++;
            }

            val = ((((q0 - p0) << 2) + (p1 - q1) + 4) >> 3);
            delta = clip(-tmp, tmp, val);

            p0 = HEAPU8[$clp + (p0 + delta)] & 255;
            q0 = HEAPU8[$clp + (q0 - delta)] & 255;
            tmp = tc;
            HEAP8[$data - imageWidth] = p0;
            HEAP8[$data] = q0;

            $data ++;
          }
        }
      } else {
        OriginalFilterHorLuma($data, bS, $thresholds, imageWidth);
      }
    }
  };

  
  Broadway.prototype = {
    configure: function (config) {
      // patchOptimizations(config, patches);
      console.info("Broadway Configured: " + JSON.stringify(config));
    }
    
  };
  
  
  
  
  /*
  
    asm.js implementation of a yuv to rgb convertor
    provided by @soliton4
    
    based on 
    http://www.wordsaretoys.com/2013/10/18/making-yuv-conversion-a-little-faster/
  
  */
  
  
  // factory to create asm.js yuv -> rgb convertor for a given resolution
  var asmInstances = {};
  var getAsm = function(parWidth, parHeight){
    var idStr = "" + parWidth + "x" + parHeight;
    if (asmInstances[idStr]){
      return asmInstances[idStr];
    };

    var lumaSize = parWidth * parHeight;
    var chromaSize = (lumaSize|0) >> 2;

    var inpSize = lumaSize + chromaSize + chromaSize;
    var outSize = parWidth * parHeight * 4;
    var cacheSize = Math.pow(2, 24) * 4;
    var size = inpSize + outSize + cacheSize;

    var chunkSize = Math.pow(2, 24);
    var heapSize = chunkSize;
    while (heapSize < size){
      heapSize += chunkSize;
    };
    var heap = new ArrayBuffer(heapSize);

    var res = asmFactory(global, {}, heap);
    res.init(parWidth, parHeight);
    asmInstances[idStr] = res;

    res.heap = heap;
    res.out = new Uint8Array(heap, 0, outSize);
    res.inp = new Uint8Array(heap, outSize, inpSize);
    res.outSize = outSize;

    return res;
  };


  function asmFactory(stdlib, foreign, heap) {
    "use asm";

    var imul = stdlib.Math.imul;
    var min = stdlib.Math.min;
    var max = stdlib.Math.max;
    var pow = stdlib.Math.pow;
    var out = new stdlib.Uint8Array(heap);
    var out32 = new stdlib.Uint32Array(heap);
    var inp = new stdlib.Uint8Array(heap);
    var mem = new stdlib.Uint8Array(heap);
    var mem32 = new stdlib.Uint32Array(heap);

    // for double algo
    /*var vt = 1.370705;
    var gt = 0.698001;
    var gt2 = 0.337633;
    var bt = 1.732446;*/

    var width = 0;
    var height = 0;
    var lumaSize = 0;
    var chromaSize = 0;
    var inpSize = 0;
    var outSize = 0;

    var inpStart = 0;
    var outStart = 0;

    var widthFour = 0;

    var cacheStart = 0;


    function init(parWidth, parHeight){
      parWidth = parWidth|0;
      parHeight = parHeight|0;

      var i = 0;
      var s = 0;

      width = parWidth;
      widthFour = imul(parWidth, 4)|0;
      height = parHeight;
      lumaSize = imul(width|0, height|0)|0;
      chromaSize = (lumaSize|0) >> 2;
      outSize = imul(imul(width, height)|0, 4)|0;
      inpSize = ((lumaSize + chromaSize)|0 + chromaSize)|0;

      outStart = 0;
      inpStart = (outStart + outSize)|0;
      cacheStart = (inpStart + inpSize)|0;

      // initializing memory (to be on the safe side)
      s = ~~(+pow(+2, +24));
      s = imul(s, 4)|0;

      for (i = 0|0; ((i|0) < (s|0))|0; i = (i + 4)|0){
        mem32[((cacheStart + i)|0) >> 2] = 0;
      };
    };

    function doit(){
      var ystart = 0;
      var ustart = 0;
      var vstart = 0;

      var y = 0;
      var yn = 0;
      var u = 0;
      var v = 0;

      var o = 0;

      var line = 0;
      var col = 0;

      var usave = 0;
      var vsave = 0;

      var ostart = 0;
      var cacheAdr = 0;

      ostart = outStart|0;

      ystart = inpStart|0;
      ustart = (ystart + lumaSize|0)|0;
      vstart = (ustart + chromaSize)|0;

      for (line = 0; (line|0) < (height|0); line = (line + 2)|0){
        usave = ustart;
        vsave = vstart;
        for (col = 0; (col|0) < (width|0); col = (col + 2)|0){
          y = inp[ystart >> 0]|0;
          yn = inp[((ystart + width)|0) >> 0]|0;

          u = inp[ustart >> 0]|0;
          v = inp[vstart >> 0]|0;

          cacheAdr = (((((y << 16)|0) + ((u << 8)|0))|0) + v)|0;
          o = mem32[((cacheStart + cacheAdr)|0) >> 2]|0;
          if (o){}else{
            o = yuv2rgbcalc(y,u,v)|0;
            mem32[((cacheStart + cacheAdr)|0) >> 2] = o|0;
          };
          mem32[ostart >> 2] = o;

          cacheAdr = (((((yn << 16)|0) + ((u << 8)|0))|0) + v)|0;
          o = mem32[((cacheStart + cacheAdr)|0) >> 2]|0;
          if (o){}else{
            o = yuv2rgbcalc(yn,u,v)|0;
            mem32[((cacheStart + cacheAdr)|0) >> 2] = o|0;
          };
          mem32[((ostart + widthFour)|0) >> 2] = o;

          //yuv2rgb5(y, u, v, ostart);
          //yuv2rgb5(yn, u, v, (ostart + widthFour)|0);
          ostart = (ostart + 4)|0;

          // next step only for y. u and v stay the same
          ystart = (ystart + 1)|0;
          y = inp[ystart >> 0]|0;
          yn = inp[((ystart + width)|0) >> 0]|0;

          //yuv2rgb5(y, u, v, ostart);
          cacheAdr = (((((y << 16)|0) + ((u << 8)|0))|0) + v)|0;
          o = mem32[((cacheStart + cacheAdr)|0) >> 2]|0;
          if (o){}else{
            o = yuv2rgbcalc(y,u,v)|0;
            mem32[((cacheStart + cacheAdr)|0) >> 2] = o|0;
          };
          mem32[ostart >> 2] = o;

          //yuv2rgb5(yn, u, v, (ostart + widthFour)|0);
          cacheAdr = (((((yn << 16)|0) + ((u << 8)|0))|0) + v)|0;
          o = mem32[((cacheStart + cacheAdr)|0) >> 2]|0;
          if (o){}else{
            o = yuv2rgbcalc(yn,u,v)|0;
            mem32[((cacheStart + cacheAdr)|0) >> 2] = o|0;
          };
          mem32[((ostart + widthFour)|0) >> 2] = o;
          ostart = (ostart + 4)|0;

          //all positions inc 1

          ystart = (ystart + 1)|0;
          ustart = (ustart + 1)|0;
          vstart = (vstart + 1)|0;
        };
        ostart = (ostart + widthFour)|0;
        ystart = (ystart + width)|0;

      };

    };

    function yuv2rgbcalc(y, u, v){
      y = y|0;
      u = u|0;
      v = v|0;

      var r = 0;
      var g = 0;
      var b = 0;

      var o = 0;

      var a0 = 0;
      var a1 = 0;
      var a2 = 0;
      var a3 = 0;
      var a4 = 0;

      a0 = imul(1192, (y - 16)|0)|0;
      a1 = imul(1634, (v - 128)|0)|0;
      a2 = imul(832, (v - 128)|0)|0;
      a3 = imul(400, (u - 128)|0)|0;
      a4 = imul(2066, (u - 128)|0)|0;

      r = (((a0 + a1)|0) >> 10)|0;
      g = (((((a0 - a2)|0) - a3)|0) >> 10)|0;
      b = (((a0 + a4)|0) >> 10)|0;

      if ((((r & 255)|0) != (r|0))|0){
        r = min(255, max(0, r|0)|0)|0;
      };
      if ((((g & 255)|0) != (g|0))|0){
        g = min(255, max(0, g|0)|0)|0;
      };
      if ((((b & 255)|0) != (b|0))|0){
        b = min(255, max(0, b|0)|0)|0;
      };

      o = 255;
      o = (o << 8)|0;
      o = (o + b)|0;
      o = (o << 8)|0;
      o = (o + g)|0;
      o = (o << 8)|0;
      o = (o + r)|0;

      return o|0;

    };



    return {
      init: init,
      doit: doit
    };
  };

  
  /*
    potential worker initialization
  
  */
  
  
  if (typeof self != "undefined"){
    var isWorker = false;
    var decoder;
    self.addEventListener('message', function(e) {
      
      if (isWorker){
        decoder.decode(new Uint8Array(e.data));
        
      }else{
        if (e.data && e.data.type === "Broadway.js - Worker init"){
          isWorker = true;
          decoder = new Broadway(e.data.options);
          decoder.onPictureDecoded = function (buffer, width, height) {
            if (buffer) {
              buffer = new Uint8Array(buffer);
            };

            // post dimensions seperately
            postMessage({width: width, height: height});

            // buffer needs to be copied because we give up ownership
            var copyU8 = new Uint8Array(buffer.length);
            copyU8.set( buffer, 0, buffer.length );
            
            // only post the buffer (slightly faster)
            // add 2nd parameter to indicate transfer of owner ship (this it was makes this worker implementation faster)
            postMessage(copyU8.buffer, [copyU8.buffer]);

          };
          postMessage({consoleLog: "initialized" });
        };
      };


    }, false);
  };
  
  
  return Broadway;
  
}));




//YUV.js

// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.YUVWebGLCanvas = factory();
    }
}(this, function () {
  
  // --------------- imported from sylvester.js
  
  
  eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('9 17={3i:\'0.1.3\',16:1e-6};l v(){}v.23={e:l(i){8(i<1||i>7.4.q)?w:7.4[i-1]},2R:l(){8 7.4.q},1u:l(){8 F.1x(7.2u(7))},24:l(a){9 n=7.4.q;9 V=a.4||a;o(n!=V.q){8 1L}J{o(F.13(7.4[n-1]-V[n-1])>17.16){8 1L}}H(--n);8 2x},1q:l(){8 v.u(7.4)},1b:l(a){9 b=[];7.28(l(x,i){b.19(a(x,i))});8 v.u(b)},28:l(a){9 n=7.4.q,k=n,i;J{i=k-n;a(7.4[i],i+1)}H(--n)},2q:l(){9 r=7.1u();o(r===0){8 7.1q()}8 7.1b(l(x){8 x/r})},1C:l(a){9 V=a.4||a;9 n=7.4.q,k=n,i;o(n!=V.q){8 w}9 b=0,1D=0,1F=0;7.28(l(x,i){b+=x*V[i-1];1D+=x*x;1F+=V[i-1]*V[i-1]});1D=F.1x(1D);1F=F.1x(1F);o(1D*1F===0){8 w}9 c=b/(1D*1F);o(c<-1){c=-1}o(c>1){c=1}8 F.37(c)},1m:l(a){9 b=7.1C(a);8(b===w)?w:(b<=17.16)},34:l(a){9 b=7.1C(a);8(b===w)?w:(F.13(b-F.1A)<=17.16)},2k:l(a){9 b=7.2u(a);8(b===w)?w:(F.13(b)<=17.16)},2j:l(a){9 V=a.4||a;o(7.4.q!=V.q){8 w}8 7.1b(l(x,i){8 x+V[i-1]})},2C:l(a){9 V=a.4||a;o(7.4.q!=V.q){8 w}8 7.1b(l(x,i){8 x-V[i-1]})},22:l(k){8 7.1b(l(x){8 x*k})},x:l(k){8 7.22(k)},2u:l(a){9 V=a.4||a;9 i,2g=0,n=7.4.q;o(n!=V.q){8 w}J{2g+=7.4[n-1]*V[n-1]}H(--n);8 2g},2f:l(a){9 B=a.4||a;o(7.4.q!=3||B.q!=3){8 w}9 A=7.4;8 v.u([(A[1]*B[2])-(A[2]*B[1]),(A[2]*B[0])-(A[0]*B[2]),(A[0]*B[1])-(A[1]*B[0])])},2A:l(){9 m=0,n=7.4.q,k=n,i;J{i=k-n;o(F.13(7.4[i])>F.13(m)){m=7.4[i]}}H(--n);8 m},2Z:l(x){9 a=w,n=7.4.q,k=n,i;J{i=k-n;o(a===w&&7.4[i]==x){a=i+1}}H(--n);8 a},3g:l(){8 S.2X(7.4)},2d:l(){8 7.1b(l(x){8 F.2d(x)})},2V:l(x){8 7.1b(l(y){8(F.13(y-x)<=17.16)?x:y})},1o:l(a){o(a.K){8 a.1o(7)}9 V=a.4||a;o(V.q!=7.4.q){8 w}9 b=0,2b;7.28(l(x,i){2b=x-V[i-1];b+=2b*2b});8 F.1x(b)},3a:l(a){8 a.1h(7)},2T:l(a){8 a.1h(7)},1V:l(t,a){9 V,R,x,y,z;2S(7.4.q){27 2:V=a.4||a;o(V.q!=2){8 w}R=S.1R(t).4;x=7.4[0]-V[0];y=7.4[1]-V[1];8 v.u([V[0]+R[0][0]*x+R[0][1]*y,V[1]+R[1][0]*x+R[1][1]*y]);1I;27 3:o(!a.U){8 w}9 C=a.1r(7).4;R=S.1R(t,a.U).4;x=7.4[0]-C[0];y=7.4[1]-C[1];z=7.4[2]-C[2];8 v.u([C[0]+R[0][0]*x+R[0][1]*y+R[0][2]*z,C[1]+R[1][0]*x+R[1][1]*y+R[1][2]*z,C[2]+R[2][0]*x+R[2][1]*y+R[2][2]*z]);1I;2P:8 w}},1t:l(a){o(a.K){9 P=7.4.2O();9 C=a.1r(P).4;8 v.u([C[0]+(C[0]-P[0]),C[1]+(C[1]-P[1]),C[2]+(C[2]-(P[2]||0))])}1d{9 Q=a.4||a;o(7.4.q!=Q.q){8 w}8 7.1b(l(x,i){8 Q[i-1]+(Q[i-1]-x)})}},1N:l(){9 V=7.1q();2S(V.4.q){27 3:1I;27 2:V.4.19(0);1I;2P:8 w}8 V},2n:l(){8\'[\'+7.4.2K(\', \')+\']\'},26:l(a){7.4=(a.4||a).2O();8 7}};v.u=l(a){9 V=25 v();8 V.26(a)};v.i=v.u([1,0,0]);v.j=v.u([0,1,0]);v.k=v.u([0,0,1]);v.2J=l(n){9 a=[];J{a.19(F.2F())}H(--n);8 v.u(a)};v.1j=l(n){9 a=[];J{a.19(0)}H(--n);8 v.u(a)};l S(){}S.23={e:l(i,j){o(i<1||i>7.4.q||j<1||j>7.4[0].q){8 w}8 7.4[i-1][j-1]},33:l(i){o(i>7.4.q){8 w}8 v.u(7.4[i-1])},2E:l(j){o(j>7.4[0].q){8 w}9 a=[],n=7.4.q,k=n,i;J{i=k-n;a.19(7.4[i][j-1])}H(--n);8 v.u(a)},2R:l(){8{2D:7.4.q,1p:7.4[0].q}},2D:l(){8 7.4.q},1p:l(){8 7.4[0].q},24:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}o(7.4.q!=M.q||7.4[0].q!=M[0].q){8 1L}9 b=7.4.q,15=b,i,G,10=7.4[0].q,j;J{i=15-b;G=10;J{j=10-G;o(F.13(7.4[i][j]-M[i][j])>17.16){8 1L}}H(--G)}H(--b);8 2x},1q:l(){8 S.u(7.4)},1b:l(a){9 b=[],12=7.4.q,15=12,i,G,10=7.4[0].q,j;J{i=15-12;G=10;b[i]=[];J{j=10-G;b[i][j]=a(7.4[i][j],i+1,j+1)}H(--G)}H(--12);8 S.u(b)},2i:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}8(7.4.q==M.q&&7.4[0].q==M[0].q)},2j:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}o(!7.2i(M)){8 w}8 7.1b(l(x,i,j){8 x+M[i-1][j-1]})},2C:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}o(!7.2i(M)){8 w}8 7.1b(l(x,i,j){8 x-M[i-1][j-1]})},2B:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}8(7.4[0].q==M.q)},22:l(a){o(!a.4){8 7.1b(l(x){8 x*a})}9 b=a.1u?2x:1L;9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}o(!7.2B(M)){8 w}9 d=7.4.q,15=d,i,G,10=M[0].q,j;9 e=7.4[0].q,4=[],21,20,c;J{i=15-d;4[i]=[];G=10;J{j=10-G;21=0;20=e;J{c=e-20;21+=7.4[i][c]*M[c][j]}H(--20);4[i][j]=21}H(--G)}H(--d);9 M=S.u(4);8 b?M.2E(1):M},x:l(a){8 7.22(a)},32:l(a,b,c,d){9 e=[],12=c,i,G,j;9 f=7.4.q,1p=7.4[0].q;J{i=c-12;e[i]=[];G=d;J{j=d-G;e[i][j]=7.4[(a+i-1)%f][(b+j-1)%1p]}H(--G)}H(--12);8 S.u(e)},31:l(){9 a=7.4.q,1p=7.4[0].q;9 b=[],12=1p,i,G,j;J{i=1p-12;b[i]=[];G=a;J{j=a-G;b[i][j]=7.4[j][i]}H(--G)}H(--12);8 S.u(b)},1y:l(){8(7.4.q==7.4[0].q)},2A:l(){9 m=0,12=7.4.q,15=12,i,G,10=7.4[0].q,j;J{i=15-12;G=10;J{j=10-G;o(F.13(7.4[i][j])>F.13(m)){m=7.4[i][j]}}H(--G)}H(--12);8 m},2Z:l(x){9 a=w,12=7.4.q,15=12,i,G,10=7.4[0].q,j;J{i=15-12;G=10;J{j=10-G;o(7.4[i][j]==x){8{i:i+1,j:j+1}}}H(--G)}H(--12);8 w},30:l(){o(!7.1y){8 w}9 a=[],n=7.4.q,k=n,i;J{i=k-n;a.19(7.4[i][i])}H(--n);8 v.u(a)},1K:l(){9 M=7.1q(),1c;9 n=7.4.q,k=n,i,1s,1n=7.4[0].q,p;J{i=k-n;o(M.4[i][i]==0){2e(j=i+1;j<k;j++){o(M.4[j][i]!=0){1c=[];1s=1n;J{p=1n-1s;1c.19(M.4[i][p]+M.4[j][p])}H(--1s);M.4[i]=1c;1I}}}o(M.4[i][i]!=0){2e(j=i+1;j<k;j++){9 a=M.4[j][i]/M.4[i][i];1c=[];1s=1n;J{p=1n-1s;1c.19(p<=i?0:M.4[j][p]-M.4[i][p]*a)}H(--1s);M.4[j]=1c}}}H(--n);8 M},3h:l(){8 7.1K()},2z:l(){o(!7.1y()){8 w}9 M=7.1K();9 a=M.4[0][0],n=M.4.q-1,k=n,i;J{i=k-n+1;a=a*M.4[i][i]}H(--n);8 a},3f:l(){8 7.2z()},2y:l(){8(7.1y()&&7.2z()===0)},2Y:l(){o(!7.1y()){8 w}9 a=7.4[0][0],n=7.4.q-1,k=n,i;J{i=k-n+1;a+=7.4[i][i]}H(--n);8 a},3e:l(){8 7.2Y()},1Y:l(){9 M=7.1K(),1Y=0;9 a=7.4.q,15=a,i,G,10=7.4[0].q,j;J{i=15-a;G=10;J{j=10-G;o(F.13(M.4[i][j])>17.16){1Y++;1I}}H(--G)}H(--a);8 1Y},3d:l(){8 7.1Y()},2W:l(a){9 M=a.4||a;o(1g(M[0][0])==\'1f\'){M=S.u(M).4}9 T=7.1q(),1p=T.4[0].q;9 b=T.4.q,15=b,i,G,10=M[0].q,j;o(b!=M.q){8 w}J{i=15-b;G=10;J{j=10-G;T.4[i][1p+j]=M[i][j]}H(--G)}H(--b);8 T},2w:l(){o(!7.1y()||7.2y()){8 w}9 a=7.4.q,15=a,i,j;9 M=7.2W(S.I(a)).1K();9 b,1n=M.4[0].q,p,1c,2v;9 c=[],2c;J{i=a-1;1c=[];b=1n;c[i]=[];2v=M.4[i][i];J{p=1n-b;2c=M.4[i][p]/2v;1c.19(2c);o(p>=15){c[i].19(2c)}}H(--b);M.4[i]=1c;2e(j=0;j<i;j++){1c=[];b=1n;J{p=1n-b;1c.19(M.4[j][p]-M.4[i][p]*M.4[j][i])}H(--b);M.4[j]=1c}}H(--a);8 S.u(c)},3c:l(){8 7.2w()},2d:l(){8 7.1b(l(x){8 F.2d(x)})},2V:l(x){8 7.1b(l(p){8(F.13(p-x)<=17.16)?x:p})},2n:l(){9 a=[];9 n=7.4.q,k=n,i;J{i=k-n;a.19(v.u(7.4[i]).2n())}H(--n);8 a.2K(\'\\n\')},26:l(a){9 i,4=a.4||a;o(1g(4[0][0])!=\'1f\'){9 b=4.q,15=b,G,10,j;7.4=[];J{i=15-b;G=4[i].q;10=G;7.4[i]=[];J{j=10-G;7.4[i][j]=4[i][j]}H(--G)}H(--b);8 7}9 n=4.q,k=n;7.4=[];J{i=k-n;7.4.19([4[i]])}H(--n);8 7}};S.u=l(a){9 M=25 S();8 M.26(a)};S.I=l(n){9 a=[],k=n,i,G,j;J{i=k-n;a[i]=[];G=k;J{j=k-G;a[i][j]=(i==j)?1:0}H(--G)}H(--n);8 S.u(a)};S.2X=l(a){9 n=a.q,k=n,i;9 M=S.I(n);J{i=k-n;M.4[i][i]=a[i]}H(--n);8 M};S.1R=l(b,a){o(!a){8 S.u([[F.1H(b),-F.1G(b)],[F.1G(b),F.1H(b)]])}9 d=a.1q();o(d.4.q!=3){8 w}9 e=d.1u();9 x=d.4[0]/e,y=d.4[1]/e,z=d.4[2]/e;9 s=F.1G(b),c=F.1H(b),t=1-c;8 S.u([[t*x*x+c,t*x*y-s*z,t*x*z+s*y],[t*x*y+s*z,t*y*y+c,t*y*z-s*x],[t*x*z-s*y,t*y*z+s*x,t*z*z+c]])};S.3b=l(t){9 c=F.1H(t),s=F.1G(t);8 S.u([[1,0,0],[0,c,-s],[0,s,c]])};S.39=l(t){9 c=F.1H(t),s=F.1G(t);8 S.u([[c,0,s],[0,1,0],[-s,0,c]])};S.38=l(t){9 c=F.1H(t),s=F.1G(t);8 S.u([[c,-s,0],[s,c,0],[0,0,1]])};S.2J=l(n,m){8 S.1j(n,m).1b(l(){8 F.2F()})};S.1j=l(n,m){9 a=[],12=n,i,G,j;J{i=n-12;a[i]=[];G=m;J{j=m-G;a[i][j]=0}H(--G)}H(--12);8 S.u(a)};l 14(){}14.23={24:l(a){8(7.1m(a)&&7.1h(a.K))},1q:l(){8 14.u(7.K,7.U)},2U:l(a){9 V=a.4||a;8 14.u([7.K.4[0]+V[0],7.K.4[1]+V[1],7.K.4[2]+(V[2]||0)],7.U)},1m:l(a){o(a.W){8 a.1m(7)}9 b=7.U.1C(a.U);8(F.13(b)<=17.16||F.13(b-F.1A)<=17.16)},1o:l(a){o(a.W){8 a.1o(7)}o(a.U){o(7.1m(a)){8 7.1o(a.K)}9 N=7.U.2f(a.U).2q().4;9 A=7.K.4,B=a.K.4;8 F.13((A[0]-B[0])*N[0]+(A[1]-B[1])*N[1]+(A[2]-B[2])*N[2])}1d{9 P=a.4||a;9 A=7.K.4,D=7.U.4;9 b=P[0]-A[0],2a=P[1]-A[1],29=(P[2]||0)-A[2];9 c=F.1x(b*b+2a*2a+29*29);o(c===0)8 0;9 d=(b*D[0]+2a*D[1]+29*D[2])/c;9 e=1-d*d;8 F.13(c*F.1x(e<0?0:e))}},1h:l(a){9 b=7.1o(a);8(b!==w&&b<=17.16)},2T:l(a){8 a.1h(7)},1v:l(a){o(a.W){8 a.1v(7)}8(!7.1m(a)&&7.1o(a)<=17.16)},1U:l(a){o(a.W){8 a.1U(7)}o(!7.1v(a)){8 w}9 P=7.K.4,X=7.U.4,Q=a.K.4,Y=a.U.4;9 b=X[0],1z=X[1],1B=X[2],1T=Y[0],1S=Y[1],1M=Y[2];9 c=P[0]-Q[0],2s=P[1]-Q[1],2r=P[2]-Q[2];9 d=-b*c-1z*2s-1B*2r;9 e=1T*c+1S*2s+1M*2r;9 f=b*b+1z*1z+1B*1B;9 g=1T*1T+1S*1S+1M*1M;9 h=b*1T+1z*1S+1B*1M;9 k=(d*g/f+h*e)/(g-h*h);8 v.u([P[0]+k*b,P[1]+k*1z,P[2]+k*1B])},1r:l(a){o(a.U){o(7.1v(a)){8 7.1U(a)}o(7.1m(a)){8 w}9 D=7.U.4,E=a.U.4;9 b=D[0],1l=D[1],1k=D[2],1P=E[0],1O=E[1],1Q=E[2];9 x=(1k*1P-b*1Q),y=(b*1O-1l*1P),z=(1l*1Q-1k*1O);9 N=v.u([x*1Q-y*1O,y*1P-z*1Q,z*1O-x*1P]);9 P=11.u(a.K,N);8 P.1U(7)}1d{9 P=a.4||a;o(7.1h(P)){8 v.u(P)}9 A=7.K.4,D=7.U.4;9 b=D[0],1l=D[1],1k=D[2],1w=A[0],18=A[1],1a=A[2];9 x=b*(P[1]-18)-1l*(P[0]-1w),y=1l*((P[2]||0)-1a)-1k*(P[1]-18),z=1k*(P[0]-1w)-b*((P[2]||0)-1a);9 V=v.u([1l*x-1k*z,1k*y-b*x,b*z-1l*y]);9 k=7.1o(P)/V.1u();8 v.u([P[0]+V.4[0]*k,P[1]+V.4[1]*k,(P[2]||0)+V.4[2]*k])}},1V:l(t,a){o(1g(a.U)==\'1f\'){a=14.u(a.1N(),v.k)}9 R=S.1R(t,a.U).4;9 C=a.1r(7.K).4;9 A=7.K.4,D=7.U.4;9 b=C[0],1E=C[1],1J=C[2],1w=A[0],18=A[1],1a=A[2];9 x=1w-b,y=18-1E,z=1a-1J;8 14.u([b+R[0][0]*x+R[0][1]*y+R[0][2]*z,1E+R[1][0]*x+R[1][1]*y+R[1][2]*z,1J+R[2][0]*x+R[2][1]*y+R[2][2]*z],[R[0][0]*D[0]+R[0][1]*D[1]+R[0][2]*D[2],R[1][0]*D[0]+R[1][1]*D[1]+R[1][2]*D[2],R[2][0]*D[0]+R[2][1]*D[1]+R[2][2]*D[2]])},1t:l(a){o(a.W){9 A=7.K.4,D=7.U.4;9 b=A[0],18=A[1],1a=A[2],2N=D[0],1l=D[1],1k=D[2];9 c=7.K.1t(a).4;9 d=b+2N,2h=18+1l,2o=1a+1k;9 Q=a.1r([d,2h,2o]).4;9 e=[Q[0]+(Q[0]-d)-c[0],Q[1]+(Q[1]-2h)-c[1],Q[2]+(Q[2]-2o)-c[2]];8 14.u(c,e)}1d o(a.U){8 7.1V(F.1A,a)}1d{9 P=a.4||a;8 14.u(7.K.1t([P[0],P[1],(P[2]||0)]),7.U)}},1Z:l(a,b){a=v.u(a);b=v.u(b);o(a.4.q==2){a.4.19(0)}o(b.4.q==2){b.4.19(0)}o(a.4.q>3||b.4.q>3){8 w}9 c=b.1u();o(c===0){8 w}7.K=a;7.U=v.u([b.4[0]/c,b.4[1]/c,b.4[2]/c]);8 7}};14.u=l(a,b){9 L=25 14();8 L.1Z(a,b)};14.X=14.u(v.1j(3),v.i);14.Y=14.u(v.1j(3),v.j);14.Z=14.u(v.1j(3),v.k);l 11(){}11.23={24:l(a){8(7.1h(a.K)&&7.1m(a))},1q:l(){8 11.u(7.K,7.W)},2U:l(a){9 V=a.4||a;8 11.u([7.K.4[0]+V[0],7.K.4[1]+V[1],7.K.4[2]+(V[2]||0)],7.W)},1m:l(a){9 b;o(a.W){b=7.W.1C(a.W);8(F.13(b)<=17.16||F.13(F.1A-b)<=17.16)}1d o(a.U){8 7.W.2k(a.U)}8 w},2k:l(a){9 b=7.W.1C(a.W);8(F.13(F.1A/2-b)<=17.16)},1o:l(a){o(7.1v(a)||7.1h(a)){8 0}o(a.K){9 A=7.K.4,B=a.K.4,N=7.W.4;8 F.13((A[0]-B[0])*N[0]+(A[1]-B[1])*N[1]+(A[2]-B[2])*N[2])}1d{9 P=a.4||a;9 A=7.K.4,N=7.W.4;8 F.13((A[0]-P[0])*N[0]+(A[1]-P[1])*N[1]+(A[2]-(P[2]||0))*N[2])}},1h:l(a){o(a.W){8 w}o(a.U){8(7.1h(a.K)&&7.1h(a.K.2j(a.U)))}1d{9 P=a.4||a;9 A=7.K.4,N=7.W.4;9 b=F.13(N[0]*(A[0]-P[0])+N[1]*(A[1]-P[1])+N[2]*(A[2]-(P[2]||0)));8(b<=17.16)}},1v:l(a){o(1g(a.U)==\'1f\'&&1g(a.W)==\'1f\'){8 w}8!7.1m(a)},1U:l(a){o(!7.1v(a)){8 w}o(a.U){9 A=a.K.4,D=a.U.4,P=7.K.4,N=7.W.4;9 b=(N[0]*(P[0]-A[0])+N[1]*(P[1]-A[1])+N[2]*(P[2]-A[2]))/(N[0]*D[0]+N[1]*D[1]+N[2]*D[2]);8 v.u([A[0]+D[0]*b,A[1]+D[1]*b,A[2]+D[2]*b])}1d o(a.W){9 c=7.W.2f(a.W).2q();9 N=7.W.4,A=7.K.4,O=a.W.4,B=a.K.4;9 d=S.1j(2,2),i=0;H(d.2y()){i++;d=S.u([[N[i%3],N[(i+1)%3]],[O[i%3],O[(i+1)%3]]])}9 e=d.2w().4;9 x=N[0]*A[0]+N[1]*A[1]+N[2]*A[2];9 y=O[0]*B[0]+O[1]*B[1]+O[2]*B[2];9 f=[e[0][0]*x+e[0][1]*y,e[1][0]*x+e[1][1]*y];9 g=[];2e(9 j=1;j<=3;j++){g.19((i==j)?0:f[(j+(5-i)%3)%3])}8 14.u(g,c)}},1r:l(a){9 P=a.4||a;9 A=7.K.4,N=7.W.4;9 b=(A[0]-P[0])*N[0]+(A[1]-P[1])*N[1]+(A[2]-(P[2]||0))*N[2];8 v.u([P[0]+N[0]*b,P[1]+N[1]*b,(P[2]||0)+N[2]*b])},1V:l(t,a){9 R=S.1R(t,a.U).4;9 C=a.1r(7.K).4;9 A=7.K.4,N=7.W.4;9 b=C[0],1E=C[1],1J=C[2],1w=A[0],18=A[1],1a=A[2];9 x=1w-b,y=18-1E,z=1a-1J;8 11.u([b+R[0][0]*x+R[0][1]*y+R[0][2]*z,1E+R[1][0]*x+R[1][1]*y+R[1][2]*z,1J+R[2][0]*x+R[2][1]*y+R[2][2]*z],[R[0][0]*N[0]+R[0][1]*N[1]+R[0][2]*N[2],R[1][0]*N[0]+R[1][1]*N[1]+R[1][2]*N[2],R[2][0]*N[0]+R[2][1]*N[1]+R[2][2]*N[2]])},1t:l(a){o(a.W){9 A=7.K.4,N=7.W.4;9 b=A[0],18=A[1],1a=A[2],2M=N[0],2L=N[1],2Q=N[2];9 c=7.K.1t(a).4;9 d=b+2M,2p=18+2L,2m=1a+2Q;9 Q=a.1r([d,2p,2m]).4;9 e=[Q[0]+(Q[0]-d)-c[0],Q[1]+(Q[1]-2p)-c[1],Q[2]+(Q[2]-2m)-c[2]];8 11.u(c,e)}1d o(a.U){8 7.1V(F.1A,a)}1d{9 P=a.4||a;8 11.u(7.K.1t([P[0],P[1],(P[2]||0)]),7.W)}},1Z:l(a,b,c){a=v.u(a);a=a.1N();o(a===w){8 w}b=v.u(b);b=b.1N();o(b===w){8 w}o(1g(c)==\'1f\'){c=w}1d{c=v.u(c);c=c.1N();o(c===w){8 w}}9 d=a.4[0],18=a.4[1],1a=a.4[2];9 e=b.4[0],1W=b.4[1],1X=b.4[2];9 f,1i;o(c!==w){9 g=c.4[0],2l=c.4[1],2t=c.4[2];f=v.u([(1W-18)*(2t-1a)-(1X-1a)*(2l-18),(1X-1a)*(g-d)-(e-d)*(2t-1a),(e-d)*(2l-18)-(1W-18)*(g-d)]);1i=f.1u();o(1i===0){8 w}f=v.u([f.4[0]/1i,f.4[1]/1i,f.4[2]/1i])}1d{1i=F.1x(e*e+1W*1W+1X*1X);o(1i===0){8 w}f=v.u([b.4[0]/1i,b.4[1]/1i,b.4[2]/1i])}7.K=a;7.W=f;8 7}};11.u=l(a,b,c){9 P=25 11();8 P.1Z(a,b,c)};11.2I=11.u(v.1j(3),v.k);11.2H=11.u(v.1j(3),v.i);11.2G=11.u(v.1j(3),v.j);11.36=11.2I;11.35=11.2H;11.3j=11.2G;9 $V=v.u;9 $M=S.u;9 $L=14.u;9 $P=11.u;',62,206,'||||elements|||this|return|var||||||||||||function|||if||length||||create|Vector|null|||||||||Math|nj|while||do|anchor||||||||Matrix||direction||normal||||kj|Plane|ni|abs|Line|ki|precision|Sylvester|A2|push|A3|map|els|else||undefined|typeof|contains|mod|Zero|D3|D2|isParallelTo|kp|distanceFrom|cols|dup|pointClosestTo|np|reflectionIn|modulus|intersects|A1|sqrt|isSquare|X2|PI|X3|angleFrom|mod1|C2|mod2|sin|cos|break|C3|toRightTriangular|false|Y3|to3D|E2|E1|E3|Rotation|Y2|Y1|intersectionWith|rotate|v12|v13|rank|setVectors|nc|sum|multiply|prototype|eql|new|setElements|case|each|PA3|PA2|part|new_element|round|for|cross|product|AD2|isSameSizeAs|add|isPerpendicularTo|v22|AN3|inspect|AD3|AN2|toUnitVector|PsubQ3|PsubQ2|v23|dot|divisor|inverse|true|isSingular|determinant|max|canMultiplyFromLeft|subtract|rows|col|random|ZX|YZ|XY|Random|join|N2|N1|D1|slice|default|N3|dimensions|switch|liesIn|translate|snapTo|augment|Diagonal|trace|indexOf|diagonal|transpose|minor|row|isAntiparallelTo|ZY|YX|acos|RotationZ|RotationY|liesOn|RotationX|inv|rk|tr|det|toDiagonalMatrix|toUpperTriangular|version|XZ'.split('|'),0,{}));
  
  
  
  
  // --------------- imported from util.js
  
  /**
 * Joins a list of lines using a newline separator, not the fastest
 * thing in the world but good enough for initialization code. 
 */
  function text(lines) {
    return lines.join("\n");
  };

  /**
 * Creates a new prototype object derived from another objects prototype along with a list of additional properties.
 *
 * @param base object whose prototype to use as the created prototype object's prototype
 * @param properties additional properties to add to the created prototype object
 */
  function inherit(base, properties) {
    var prot = Object.create(base.prototype);
    for (var p in properties) {
      prot[p] = properties[p];
    }
    return prot;
  };
  
  function error(message) {
    console.error(message);
    console.trace();
  };

  
  function assert(condition, message) {
    if (!condition) {
      error(message);
    };
  };

  
  
  // --------------- imported from glutils.js
  

  // augment Sylvester some
  Matrix.Translation = function (v)
  {
    if (v.elements.length == 2) {
      var r = Matrix.I(3);
      r.elements[2][0] = v.elements[0];
      r.elements[2][1] = v.elements[1];
      return r;
    }

    if (v.elements.length == 3) {
      var r = Matrix.I(4);
      r.elements[0][3] = v.elements[0];
      r.elements[1][3] = v.elements[1];
      r.elements[2][3] = v.elements[2];
      return r;
    }

    throw "Invalid length for Translation";
  }

  Matrix.prototype.flatten = function ()
  {
    var result = [];
    if (this.elements.length == 0)
      return [];


    for (var j = 0; j < this.elements[0].length; j++)
      for (var i = 0; i < this.elements.length; i++)
        result.push(this.elements[i][j]);
    return result;
  }

  Matrix.prototype.ensure4x4 = function()
  {
    if (this.elements.length == 4 &&
        this.elements[0].length == 4)
      return this;

    if (this.elements.length > 4 ||
        this.elements[0].length > 4)
      return null;

    for (var i = 0; i < this.elements.length; i++) {
      for (var j = this.elements[i].length; j < 4; j++) {
        if (i == j)
          this.elements[i].push(1);
        else
          this.elements[i].push(0);
      }
    }

    for (var i = this.elements.length; i < 4; i++) {
      if (i == 0)
        this.elements.push([1, 0, 0, 0]);
      else if (i == 1)
        this.elements.push([0, 1, 0, 0]);
      else if (i == 2)
        this.elements.push([0, 0, 1, 0]);
      else if (i == 3)
        this.elements.push([0, 0, 0, 1]);
    }

    return this;
  };

  Matrix.prototype.make3x3 = function()
  {
    if (this.elements.length != 4 ||
        this.elements[0].length != 4)
      return null;

    return Matrix.create([[this.elements[0][0], this.elements[0][1], this.elements[0][2]],
                          [this.elements[1][0], this.elements[1][1], this.elements[1][2]],
                          [this.elements[2][0], this.elements[2][1], this.elements[2][2]]]);
  };

  Vector.prototype.flatten = function ()
  {
    return this.elements;
  };

  function mht(m) {
    var s = "";
    if (m.length == 16) {
      for (var i = 0; i < 4; i++) {
        s += "<span style='font-family: monospace'>[" + m[i*4+0].toFixed(4) + "," + m[i*4+1].toFixed(4) + "," + m[i*4+2].toFixed(4) + "," + m[i*4+3].toFixed(4) + "]</span><br>";
      }
    } else if (m.length == 9) {
      for (var i = 0; i < 3; i++) {
        s += "<span style='font-family: monospace'>[" + m[i*3+0].toFixed(4) + "," + m[i*3+1].toFixed(4) + "," + m[i*3+2].toFixed(4) + "]</font><br>";
      }
    } else {
      return m.toString();
    }
    return s;
  }

  //
  // gluLookAt
  //
  function makeLookAt(ex, ey, ez,
                       cx, cy, cz,
                       ux, uy, uz)
  {
    var eye = $V([ex, ey, ez]);
    var center = $V([cx, cy, cz]);
    var up = $V([ux, uy, uz]);

    var mag;

    var z = eye.subtract(center).toUnitVector();
    var x = up.cross(z).toUnitVector();
    var y = z.cross(x).toUnitVector();

    var m = $M([[x.e(1), x.e(2), x.e(3), 0],
                [y.e(1), y.e(2), y.e(3), 0],
                [z.e(1), z.e(2), z.e(3), 0],
                [0, 0, 0, 1]]);

    var t = $M([[1, 0, 0, -ex],
                [0, 1, 0, -ey],
                [0, 0, 1, -ez],
                [0, 0, 0, 1]]);
    return m.x(t);
  }

  //
  // glOrtho
  //
  function makeOrtho(left, right,
                      bottom, top,
                      znear, zfar)
  {
    var tx = -(right+left)/(right-left);
    var ty = -(top+bottom)/(top-bottom);
    var tz = -(zfar+znear)/(zfar-znear);

    return $M([[2/(right-left), 0, 0, tx],
               [0, 2/(top-bottom), 0, ty],
               [0, 0, -2/(zfar-znear), tz],
               [0, 0, 0, 1]]);
  }

  //
  // gluPerspective
  //
  function makePerspective(fovy, aspect, znear, zfar)
  {
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return makeFrustum(xmin, xmax, ymin, ymax, znear, zfar);
  }

  //
  // glFrustum
  //
  function makeFrustum(left, right,
                        bottom, top,
                        znear, zfar)
  {
    var X = 2*znear/(right-left);
    var Y = 2*znear/(top-bottom);
    var A = (right+left)/(right-left);
    var B = (top+bottom)/(top-bottom);
    var C = -(zfar+znear)/(zfar-znear);
    var D = -2*zfar*znear/(zfar-znear);

    return $M([[X, 0, A, 0],
               [0, Y, B, 0],
               [0, 0, C, D],
               [0, 0, -1, 0]]);
  }

  //
  // glOrtho
  //
  function makeOrtho(left, right, bottom, top, znear, zfar)
  {
    var tx = - (right + left) / (right - left);
    var ty = - (top + bottom) / (top - bottom);
    var tz = - (zfar + znear) / (zfar - znear);

    return $M([[2 / (right - left), 0, 0, tx],
               [0, 2 / (top - bottom), 0, ty],
               [0, 0, -2 / (zfar - znear), tz],
               [0, 0, 0, 1]]);
  }


  // -----------------------------------------------------------



  /*
 * This file wraps several WebGL constructs and provides a simple, single texture based WebGLCanvas as well as a
 * specialized YUVWebGLCanvas that can handle YUV->RGB conversion. 
 */

  /**
 * Represents a WebGL shader script.
 */
  var Script = (function script() {
    function constructor() {}

    constructor.createFromElementId = function(id) {
      var script = document.getElementById(id);

      // Didn't find an element with the specified ID, abort.
      assert(script , "Could not find shader with ID: " + id);

      // Walk through the source element's children, building the shader source string.
      var source = "";
      var currentChild = script .firstChild;
      while(currentChild) {
        if (currentChild.nodeType == 3) {
          source += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
      }

      var res = new constructor();
      res.type = script.type;
      res.source = source;
      return res;
    };

    constructor.createFromSource = function(type, source) {
      var res = new constructor();
      res.type = type;
      res.source = source;
      return res;
    };
    return constructor;
  })();

  /**
 * Represents a WebGL shader object and provides a mechanism to load shaders from HTML
 * script tags.
 */
  var Shader = (function shader() {
    function constructor(gl, script) {

      // Now figure out what type of shader script we have, based on its MIME type.
      if (script.type == "x-shader/x-fragment") {
        this.shader = gl.createShader(gl.FRAGMENT_SHADER);
      } else if (script.type == "x-shader/x-vertex") {
        this.shader = gl.createShader(gl.VERTEX_SHADER);
      } else {
        error("Unknown shader type: " + script.type);
        return;
      }

      // Send the source to the shader object.
      gl.shaderSource(this.shader, script.source);

      // Compile the shader program.
      gl.compileShader(this.shader);

      // See if it compiled successfully.
      if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
        error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(this.shader));
        return;
      }
    }
    return constructor;
  })();

  var Program = (function () {
    function constructor(gl) {
      this.gl = gl;
      this.program = this.gl.createProgram();
    }
    constructor.prototype = {
      attach: function (shader) {
        this.gl.attachShader(this.program, shader.shader);
      }, 
      link: function () {
        this.gl.linkProgram(this.program);
        // If creating the shader program failed, alert.
        assert(this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS),
               "Unable to initialize the shader program.");
      },
      use: function () {
        this.gl.useProgram(this.program);
      },
      getAttributeLocation: function(name) {
        return this.gl.getAttribLocation(this.program, name);
      },
      setMatrixUniform: function(name, array) {
        var uniform = this.gl.getUniformLocation(this.program, name);
        this.gl.uniformMatrix4fv(uniform, false, array);
      }
    };
    return constructor;
  })();

  /**
 * Represents a WebGL texture object.
 */
  var Texture = (function texture() {
    function constructor(gl, size, format) {
      this.gl = gl;
      this.size = size;
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.format = format ? format : gl.LUMINANCE; 
      gl.texImage2D(gl.TEXTURE_2D, 0, this.format, size.w, size.h, 0, this.format, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    var textureIDs = null;
    constructor.prototype = {
      fill: function(textureData, useTexSubImage2D) {
        var gl = this.gl;
        assert(textureData.length >= this.size.w * this.size.h, 
               "Texture size mismatch, data:" + textureData.length + ", texture: " + this.size.w * this.size.h);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (useTexSubImage2D) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size.w , this.size.h, this.format, gl.UNSIGNED_BYTE, textureData);
        } else {
          // texImage2D seems to be faster, thus keeping it as the default
          gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.size.w, this.size.h, 0, this.format, gl.UNSIGNED_BYTE, textureData);
        }
      },
      bind: function(n, program, name) {
        var gl = this.gl;
        if (!textureIDs) {
          textureIDs = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2];
        }
        gl.activeTexture(textureIDs[n]);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(gl.getUniformLocation(program.program, name), n);
      }
    };
    return constructor; 
  })();

  /**
 * Generic WebGL backed canvas that sets up: a quad to paint a texture on, appropriate vertex/fragment shaders,
 * scene parameters and other things. Specialized versions of this class can be created by overriding several 
 * initialization methods.
 * 
 * <code>
 * var canvas = new WebGLCanvas(document.getElementById('canvas'), new Size(512, 512);
 * canvas.texture.fill(data);
 * canvas.drawScene();
 * </code>
 */
  var WebGLCanvas = (function () {

    var vertexShaderScript = Script.createFromSource("x-shader/x-vertex", text([
      "attribute vec3 aVertexPosition;",
      "attribute vec2 aTextureCoord;",
      "uniform mat4 uMVMatrix;",
      "uniform mat4 uPMatrix;",
      "varying highp vec2 vTextureCoord;",
      "void main(void) {",
      "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
      "  vTextureCoord = aTextureCoord;",
      "}"
    ]));

    var fragmentShaderScript = Script.createFromSource("x-shader/x-fragment", text([
      "precision highp float;",
      "varying highp vec2 vTextureCoord;",
      "uniform sampler2D texture;",
      "void main(void) {",
      "  gl_FragColor = texture2D(texture, vTextureCoord);",
      "}"
    ]));

    function constructor(canvas, size, useFrameBuffer) {
      this.canvas = canvas;
      this.size = size;
      this.canvas.width = size.w;
      this.canvas.height = size.h;

      this.onInitWebGL();
      this.onInitShaders();
      initBuffers.call(this);
      if (useFrameBuffer) {
        initFramebuffer.call(this);
      }
      this.onInitTextures();
      initScene.call(this);
    }

    /**
   * Initialize a frame buffer so that we can render off-screen.
   */
    function initFramebuffer() {
      var gl = this.gl;

      // Create framebuffer object and texture.
      this.framebuffer = gl.createFramebuffer(); 
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      this.framebufferTexture = new Texture(this.gl, this.size, gl.RGBA);

      // Create and allocate renderbuffer for depth data.
      var renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size.w, this.size.h);

      // Attach texture and renderbuffer to the framebuffer.
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.framebufferTexture.texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
    }

    /**
   * Initialize vertex and texture coordinate buffers for a plane.
   */
    function initBuffers() {
      var tmp;
      var gl = this.gl;

      // Create vertex position buffer.
      this.quadVPBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVPBuffer);
      tmp = [
        1.0,  1.0, 0.0,
        -1.0,  1.0, 0.0, 
        1.0, -1.0, 0.0, 
        -1.0, -1.0, 0.0];

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp), gl.STATIC_DRAW);
      this.quadVPBuffer.itemSize = 3;
      this.quadVPBuffer.numItems = 4;

      /*
     +--------------------+ 
     | -1,1 (1)           | 1,1 (0)
     |                    |
     |                    |
     |                    |
     |                    |
     |                    |
     | -1,-1 (3)          | 1,-1 (2)
     +--------------------+
     */

      var scaleX = 1.0;
      var scaleY = 1.0;

      // Create vertex texture coordinate buffer.
      this.quadVTCBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVTCBuffer);
      tmp = [
        scaleX, 0.0,
        0.0, 0.0,
        scaleX, scaleY,
        0.0, scaleY,
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp), gl.STATIC_DRAW);
    }

    function mvIdentity() {
      this.mvMatrix = Matrix.I(4);
    }

    function mvMultiply(m) {
      this.mvMatrix = this.mvMatrix.x(m);
    }

    function mvTranslate(m) {
      mvMultiply.call(this, Matrix.Translation($V([m[0], m[1], m[2]])).ensure4x4());
    }

    function setMatrixUniforms() {
      this.program.setMatrixUniform("uPMatrix", new Float32Array(this.perspectiveMatrix.flatten()));
      this.program.setMatrixUniform("uMVMatrix", new Float32Array(this.mvMatrix.flatten()));
    }

    function initScene() {
      var gl = this.gl;

      // Establish the perspective with which we want to view the
      // scene. Our field of view is 45 degrees, with a width/height
      // ratio of 640:480, and we only want to see objects between 0.1 units
      // and 100 units away from the camera.

      this.perspectiveMatrix = makePerspective(45, 1, 0.1, 100.0);

      // Set the drawing position to the "identity" point, which is
      // the center of the scene.
      mvIdentity.call(this);

      // Now move the drawing position a bit to where we want to start
      // drawing the square.
      mvTranslate.call(this, [0.0, 0.0, -2.4]);

      // Draw the cube by binding the array buffer to the cube's vertices
      // array, setting attributes, and pushing it to GL.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVPBuffer);
      gl.vertexAttribPointer(this.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

      // Set the texture coordinates attribute for the vertices.

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVTCBuffer);
      gl.vertexAttribPointer(this.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);  

      this.onInitSceneTextures();

      setMatrixUniforms.call(this);

      if (this.framebuffer) {
        console.log("Bound Frame Buffer");
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      }
    }

    constructor.prototype = {
      toString: function() {
        return "WebGLCanvas Size: " + this.size;
      },
      checkLastError: function (operation) {
        var err = this.gl.getError();
        if (err != this.gl.NO_ERROR) {
          var name = this.glNames[err];
          name = (name !== undefined) ? name + "(" + err + ")":
          ("Unknown WebGL ENUM (0x" + value.toString(16) + ")");
          if (operation) {
            console.log("WebGL Error: %s, %s", operation, name);
          } else {
            console.log("WebGL Error: %s", name);
          }
          console.trace();
        }
      },
      onInitWebGL: function () {
        try {
          this.gl = this.canvas.getContext("experimental-webgl");
        } catch(e) {}

        if (!this.gl) {
          error("Unable to initialize WebGL. Your browser may not support it.");
        }
        if (this.glNames) {
          return;
        }
        this.glNames = {};
        for (var propertyName in this.gl) {
          if (typeof this.gl[propertyName] == 'number') {
            this.glNames[this.gl[propertyName]] = propertyName;
          }
        }
      },
      onInitShaders: function() {
        this.program = new Program(this.gl);
        this.program.attach(new Shader(this.gl, vertexShaderScript));
        this.program.attach(new Shader(this.gl, fragmentShaderScript));
        this.program.link();
        this.program.use();
        this.vertexPositionAttribute = this.program.getAttributeLocation("aVertexPosition");
        this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
        this.textureCoordAttribute = this.program.getAttributeLocation("aTextureCoord");;
        this.gl.enableVertexAttribArray(this.textureCoordAttribute);
      },
      onInitTextures: function () {
        var gl = this.gl;
        this.texture = new Texture(gl, this.size, gl.RGBA);
      },
      onInitSceneTextures: function () {
        this.texture.bind(0, this.program, "texture");
      },
      drawScene: function() {
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      },
      readPixels: function(buffer) {
        var gl = this.gl;
        gl.readPixels(0, 0, this.size.w, this.size.h, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
      }
    };
    return constructor;
  })();

  var YUVWebGLCanvas = (function () {
    var vertexShaderScript = Script.createFromSource("x-shader/x-vertex", text([
      "attribute vec3 aVertexPosition;",
      "attribute vec2 aTextureCoord;",
      "uniform mat4 uMVMatrix;",
      "uniform mat4 uPMatrix;",
      "varying highp vec2 vTextureCoord;",
      "void main(void) {",
      "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
      "  vTextureCoord = aTextureCoord;",
      "}"
    ]));

    var fragmentShaderScriptOld = Script.createFromSource("x-shader/x-fragment", text([
      "precision highp float;",
      "varying highp vec2 vTextureCoord;",
      "uniform sampler2D YTexture;",
      "uniform sampler2D UTexture;",
      "uniform sampler2D VTexture;",

      "void main(void) {",
      "  vec3 YUV = vec3",
      "  (",
      "    texture2D(YTexture, vTextureCoord).x * 1.1643828125,   // premultiply Y",
      "    texture2D(UTexture, vTextureCoord).x,",
      "    texture2D(VTexture, vTextureCoord).x",
      "  );",
      "  gl_FragColor = vec4",
      "  (",
      "    YUV.x + 1.59602734375 * YUV.z - 0.87078515625,",
      "    YUV.x - 0.39176171875 * YUV.y - 0.81296875 * YUV.z + 0.52959375,",
      "    YUV.x + 2.017234375   * YUV.y - 1.081390625,",
      "    1",
      "  );",
      "}"
    ]));

    var fragmentShaderScriptSimple = Script.createFromSource("x-shader/x-fragment", text([
      "precision highp float;",
      "varying highp vec2 vTextureCoord;",
      "uniform sampler2D YTexture;",
      "uniform sampler2D UTexture;",
      "uniform sampler2D VTexture;",

      "void main(void) {",
      "  gl_FragColor = texture2D(YTexture, vTextureCoord);",
      "}"
    ]));

    var fragmentShaderScript = Script.createFromSource("x-shader/x-fragment", text([
      "precision highp float;",
      "varying highp vec2 vTextureCoord;",
      "uniform sampler2D YTexture;",
      "uniform sampler2D UTexture;",
      "uniform sampler2D VTexture;",
      "const mat4 YUV2RGB = mat4",
      "(",
      " 1.1643828125, 0, 1.59602734375, -.87078515625,",
      " 1.1643828125, -.39176171875, -.81296875, .52959375,",
      " 1.1643828125, 2.017234375, 0, -1.081390625,",
      " 0, 0, 0, 1",
      ");",

      "void main(void) {",
      " gl_FragColor = vec4( texture2D(YTexture,  vTextureCoord).x, texture2D(UTexture, vTextureCoord).x, texture2D(VTexture, vTextureCoord).x, 1) * YUV2RGB;",
      "}"
    ]));


    function constructor(canvas, size) {
      WebGLCanvas.call(this, canvas, size);
    } 

    constructor.prototype = inherit(WebGLCanvas, {
      onInitShaders: function() {
        this.program = new Program(this.gl);
        this.program.attach(new Shader(this.gl, vertexShaderScript));
        this.program.attach(new Shader(this.gl, fragmentShaderScript));
        this.program.link();
        this.program.use();
        this.vertexPositionAttribute = this.program.getAttributeLocation("aVertexPosition");
        this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
        this.textureCoordAttribute = this.program.getAttributeLocation("aTextureCoord");;
        this.gl.enableVertexAttribArray(this.textureCoordAttribute);
      },
      onInitTextures: function () {
        console.log("creatingTextures: size: " + this.size);
        this.YTexture = new Texture(this.gl, this.size);
        this.UTexture = new Texture(this.gl, this.size.getHalfSize());
        this.VTexture = new Texture(this.gl, this.size.getHalfSize());
      },
      onInitSceneTextures: function () {
        this.YTexture.bind(0, this.program, "YTexture");
        this.UTexture.bind(1, this.program, "UTexture");
        this.VTexture.bind(2, this.program, "VTexture");
      },
      fillYUVTextures: function(y, u, v) {
        this.YTexture.fill(y);
        this.UTexture.fill(u);
        this.VTexture.fill(v);
      },
      toString: function() {
        return "YUVCanvas Size: " + this.size;
      }
    });

    return constructor;
  })(); 


  var FilterWebGLCanvas = (function () {
    var vertexShaderScript = Script.createFromSource("x-shader/x-vertex", text([
      "attribute vec3 aVertexPosition;",
      "attribute vec2 aTextureCoord;",
      "uniform mat4 uMVMatrix;",
      "uniform mat4 uPMatrix;",
      "varying highp vec2 vTextureCoord;",
      "void main(void) {",
      "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);",
      "  vTextureCoord = aTextureCoord;",
      "}"
    ]));

    var fragmentShaderScript = Script.createFromSource("x-shader/x-fragment", text([
      "precision highp float;",
      "varying highp vec2 vTextureCoord;",
      "uniform sampler2D FTexture;",

      "void main(void) {",
      " gl_FragColor = texture2D(FTexture,  vTextureCoord);",
      "}"
    ]));


    function constructor(canvas, size, useFrameBuffer) {
      WebGLCanvas.call(this, canvas, size, useFrameBuffer);
    } 

    constructor.prototype = inherit(WebGLCanvas, {
      onInitShaders: function() {
        this.program = new Program(this.gl);
        this.program.attach(new Shader(this.gl, vertexShaderScript));
        this.program.attach(new Shader(this.gl, fragmentShaderScript));
        this.program.link();
        this.program.use();
        this.vertexPositionAttribute = this.program.getAttributeLocation("aVertexPosition");
        this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
        this.textureCoordAttribute = this.program.getAttributeLocation("aTextureCoord");
        this.gl.enableVertexAttribArray(this.textureCoordAttribute);
      },
      onInitTextures: function () {
        console.log("creatingTextures: size: " + this.size);
        this.FTexture = new Texture(this.gl, this.size, this.gl.RGBA);
      },
      onInitSceneTextures: function () {
        this.FTexture.bind(0, this.program, "FTexture");
      },
      process: function(buffer, output) {
        this.FTexture.fill(buffer);
        this.drawScene();
        this.readPixels(output);
      },
      toString: function() {
        return "FilterWebGLCanvas Size: " + this.size;
      }
    });

    return constructor;
  })(); 
  
  
  return YUVWebGLCanvas;
  
}));
