/**
 * Author:wzc0x0@gmail.com
 * For:PC Upload Image
 * And so on...
 */
    //polyfill IE11
    var Promise = require('./lib/Promise');

    function WebUploadImg (file, opts) {
        var that = this;

        if (!file) throw new Error('Sorry!no files upload');

        opts = opts || {};

        that.defaults = {
            width    : null,
            height   : null,
            fieldName: 'file',
            quality  : 0.7
        };

        that.file = file;

        for (var p in opts) {
            if (!opts.hasOwnProperty(p)) continue;
            that.defaults[p] = opts[p];
        }

        return that.init();
    }

    WebUploadImg.prototype.init = function () {
        var that         = this ,
            file         = that.file,
            fileIsString = typeof file === 'string',
            fileIsBase64 = /^data:/.test(file),
            img          = new Image(),
            canvas       = document.createElement('canvas'),
            //blob         = fileIsString ? file : that._fileToDataURL();
            blob         = null;

        //that.img = img;
        //that.blob = blob;
        //img.src = blob;

        that._fileToDataURL().then(function (dataURL) {
            blob = dataURL;
            that.blob = blob;
            img.src = blob;
            that.img = img;
        });

        that.canvas = canvas;

        if (fileIsString) {
            that.fileName = fileIsBase64 ? 'base64.jpg' : (file.split('/').pop());
        } else {
            that.fileName = file.name;
        }

        if (!document.createElement('canvas').getContext) {
            throw new Error('Your browser dose not support canvas!');
        }

        return new Promise(function (resolve,reject) {
            img.onerror = function () {
                var err = new Error('Loader Image failure!');
                reject(err);
                throw err;
            };
            img.onload = function () {
                that._getBase64()
                    .then(function (base64) {
                        if(base64.length < 10){
                            var err = new Error("Create Base64 error!");
                            reject(err);
                            throw err;
                        }
                        return base64;
                    })
                    .then(function (base64) {
                        var formData = new FormData();

                        // 压缩文件太大就采用源文件,就使用原生的FormData() @source #55
                        if(typeof that.file === "object" && base64.length > that.file.size)
                            file = that.file;
                        else
                            file = dataURItoBlob(base64);

                        formData.append(that.defaults.fieldName,file,(that.fileName.replace(/\..+/g, '.jpg')));

                        resolve({
                            formData:formData,
                            fileLen:file.size,
                            base64:base64,
                            origin:that.file,
                            file:file,
                            compressRate:(file.size/that.file.size).toFixed(2)
                        });

                        //释放内存
                        for(var p in that){
                            if(!that.hasOwnProperty(p)) continue;
                            that[p] = null;
                        }
                        try {
                            URL.revokeObjectURL(that.blob);
                        }catch (e){
                            var err = new Error("Global variable URL is polluted");
                            console.log(e);
                            throw err;
                        }
                    })
            };
        })
    };

    WebUploadImg.prototype._getBase64 = function () {
        var that = this,
            canvas = that.canvas;

        return new Promise(function (resolve) {
            that.resize = that._getResize();
            that.ctx    = canvas.getContext('2d');

            canvas.width  = that.resize.width;
            canvas.height = that.resize.height;

            // 设置为白色背景，jpg是不支持透明的，所以会被默认为canvas默认的黑色背景。
            that.ctx.fillStyle = '#fff';
            that.ctx.fillRect(0, 0, canvas.width, canvas.height);

            that._createBase64().then(resolve);
        })
    };

    WebUploadImg.prototype._createBase64 = function () {
        var that = this,
            resize = that.resize,
            img = that.img,
            canvas = that.canvas,
            ctx = that.ctx,
            defaults = that.defaults;

        ctx.drawImage(img, 0, 0, resize.width, resize.height);

        return new Promise(function (resolve) {
            resolve(canvas.toDataURL('image/jpeg',defaults.quality))
        })
    };

    WebUploadImg.prototype._getResize = function () {
        var that        = this,
            img         = that.img,
            defaults    = that.defaults,
            width       = defaults.width,
            height      = defaults.height;

        var ret = {
            width : img.width,
            height: img.height
        };

        // 如果原图小于设定，采用原图
        if(ret.width < width || ret.height < height) {
            return ret;
        }

        var scale = ret.width/ret.height;

        if (width && height) {
            if (scale >= width / height)     {
                if (ret.width > width) {
                    ret.width  = width;
                    ret.height = Math.ceil(width / scale);
                }
            } else {
                if (ret.height > height) {
                    ret.height = height;
                    ret.width  = Math.ceil(height * scale);
                }
            }
        }
        else if (width) {
            if (width < ret.width) {
                ret.width  = width;
                ret.height = Math.ceil(width / scale);
            }
        }
        else if (height) {
            if (height < ret.height) {
                ret.width  = Math.ceil(height * scale);
                ret.height = height;
            }
        }

        return ret;

    };

    /**
     * 转换成formdata
     * @param dataURI
     * @returns {*}
     * @source http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
     */
    function dataURItoBlob (dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to a typed array
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new window.Blob([ia.buffer], {type: mimeString});
    }

    /**
     * file 转成 dataURL
     * @param file 文件
     * 针对某些逗逼设置URL污染全局变量
     */

    WebUploadImg.prototype._fileToDataURL = function () {
        var that         = this,
            file         = that.file,
            fileIsString = that.fileIsString;

        return new Promise(function (resolve) {
            if(fileIsString) resolve(file);

            try {
                resolve(URL.createObjectURL(file));
            } catch (e) {
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function () {
                    resolve(this.result);
                }
            }
        })
    };
    
    window.WebUploadImg = function (file,opts) {
        return new WebUploadImg(file,opts);
    };

    module.exports = window.WebUploadImg;



















