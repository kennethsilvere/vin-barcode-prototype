import { Component, OnInit } from '@angular/core';
import Quagga from 'quagga';
import * as $ from 'jquery';
import { ImageCapture } from 'image-capture';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  scannerIsRunning = false;
  value: string;
  isError = false;
  scannedVinNumber;
  imageCapture;
  theStream;
  imageUrl;
  scanAgain = false;
  noBarcodeFound = false;

  onError(error) {
    console.error(error);
    this.isError = true;
  }

  orderByOccurence(arr) {
    var counts = {};
    arr.forEach(function (value) {
      if (!counts[value]) {
        counts[value] = 0;
      }
      counts[value]++;
    });

    let getSortParameters = (curKey, nextKey) => {
      if (counts[curKey] < counts[nextKey]) {
        return -1;
      }
      if (counts[curKey] > counts[nextKey]) {
        return 1;
      }
      return 0;
    };

    return Object.keys(counts).sort((a, b) => getSortParameters(a, b));
  }

  constructor() {}

  ngOnInit() {
    this.onGetUserMediaButtonClick();
  }

  onGetUserMediaButtonClick() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream) => {
        document.querySelector('video').srcObject = mediaStream;

        const track = mediaStream.getVideoTracks()[0];
        this.imageCapture = new ImageCapture(track);
      })
      .catch((error) => console.log(error));
  }

  loadVideoForImageStream() {
    navigator.mediaDevices.getUserMedia({ video: true }).then((mediaStream) => {
      const track: any = mediaStream.getVideoTracks()[0];
      let zoom: any = document.querySelector('#barcode-scanner');
      const capabilities: any = track.getCapabilities();
      // Check whether zoom is supported or not.
      // if (!capabilities.zoom) {
      //   return;
      // }
      track.applyConstraints({ advanced: [{ zoom: zoom.value }] });

      this.imageCapture = new ImageCapture(track);
    });
  }

  detectBarcodeFromCanvas() {
    var last_result = [];
    const self = this;
    Quagga.decodeSingle(
      {
        decoder: {
          readers: ['code_39_reader', 'code_39_vin_reader', 'codabar_reader'],
        },
        locate: true,
        src: this.imageUrl,
      },
      function (result) {
        if(result) {
          if (result.codeResult !== undefined) {
            self.scannedVinNumber = result.codeResult.code;
          } else {
            self.scanAgain = true;
          }
        } else {
          self.noBarcodeFound = true;
        }
      }
    );
  }

  load_quagga() {
    if (
      $('#barcode-scanner').length > 0 &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      Quagga.initialized = undefined;
      this.scannedVinNumber = undefined;
      const self = this;

      var last_result = [];
      if (Quagga.initialized == undefined) {
        Quagga.onDetected(function (result) {
          var last_code = result.codeResult.code;
          last_result.push(last_code);
          if (last_result.length > 20) {
            let code = self.orderByOccurence(last_result);
            self.scannedVinNumber = code[0];
            console.log(code);
            last_result = [];
            Quagga.stop();
          }
        });
      }

      Quagga.init(
        {
          inputStream: {
            name: 'Live',

            type: 'LiveStream',
            numOfWorkers: navigator.hardwareConcurrency,
            target: document.querySelector('#takePhotoCanvas'),
          },
          decoder: {
            readers: ['code_39_reader', 'code_39_vin_reader', 'codabar_reader'],
          },
        },
        function (err) {
          if (err) {
            console.log(err);
            return;
          }
          Quagga.initialized = true;
          Quagga.start();
          $('canvas').css('height', 0);
          $('video').css('width', '95vw');
          $('video').css('borderRadius', '2%');
          // self.getStream();
        }
      );
    }
  }

  take_picture() {
    this.scanAgain = false;
    this.imageCapture
      .takePhoto()
      .then((blob) => {
        this.imageUrl = URL.createObjectURL(blob);
        return createImageBitmap(blob);
      })
      .then((imageBitmap) => {
        const canvas = document.querySelector('#takePhotoCanvas');
        this.drawCanvas(canvas, imageBitmap);
        this.detectBarcodeFromCanvas();
      })
      .catch((error) => console.log(error));
  }

  drawCanvas(canvas, img) {
    canvas.width = getComputedStyle(canvas).width.split('px')[0];
    canvas.height = getComputedStyle(canvas).height.split('px')[0];
    let ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    let x = (canvas.width - img.width * ratio) / 2;
    let y = (canvas.height - img.height * ratio) / 2;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas
      .getContext('2d')
      .drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        x,
        y,
        img.width * ratio,
        img.height * ratio
      );
  }

  getUserMedia(options, successCallback, failureCallback) {
    var api = navigator.getUserMedia;
    if (api) {
      return api.bind(navigator)(options, successCallback, failureCallback);
    }
  }

  getStream() {
    if (!navigator.getUserMedia) {
      alert('User Media API not supported.');
      return;
    }

    var constraints = {
      video: true,
    };

    const self = this;
    this.getUserMedia(
      constraints,
      function (stream) {
        let mediaControl: any = document.querySelector('video');
        if ('srcObject' in mediaControl) {
          mediaControl.srcObject = stream;
        } else {
          mediaControl.src = (window.URL || window.webkitURL).createObjectURL(
            stream
          );
        }
        self.theStream = stream;
      },
      function (err) {
        alert('Error: ' + err);
      }
    );
  }
}
