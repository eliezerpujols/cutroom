import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
if args.count != 5 { fputs("Usage: vision cutout|track input-dir output-dir image|video\n",stderr); exit(1) }
let mode=args[1], input=URL(fileURLWithPath:args[2]), output=URL(fileURLWithPath:args[3])
let files=try FileManager.default.contentsOfDirectory(at:input,includingPropertiesForKeys:nil).filter{$0.pathExtension=="png"}.sorted{$0.lastPathComponent<$1.lastPathComponent}
let context=CIContext(options:[.cacheIntermediates:false])
let person=VNGeneratePersonSegmentationRequest(); person.qualityLevel = .accurate; person.outputPixelFormat=kCVPixelFormatType_OneComponent8
let sequence=VNSequenceRequestHandler()
var keys=[[String:Double]](),last=CGPoint(x:0.5,y:0.5),found=0
for (index,url) in files.enumerated() {
 try autoreleasepool {
  guard let source=CGImageSourceCreateWithURL(url as CFURL,nil),let cg=CGImageSourceCreateImageAtIndex(source,0,nil) else {throw NSError(domain:"Cutroom",code:1,userInfo:[NSLocalizedDescriptionKey:"Cannot decode analysis frame."])}
  if mode=="cutout" {
   try sequence.perform([person],on:cg)
   guard let buffer=person.results?.first?.pixelBuffer else {throw NSError(domain:"Cutroom",code:2,userInfo:[NSLocalizedDescriptionKey:"Person segmentation did not produce a mask."])}
   CVPixelBufferLockBaseAddress(buffer,.readOnly)
   if let base=CVPixelBufferGetBaseAddress(buffer) {let bytes=base.assumingMemoryBound(to:UInt8.self),stride=CVPixelBufferGetBytesPerRow(buffer),width=CVPixelBufferGetWidth(buffer),height=CVPixelBufferGetHeight(buffer);var personFound=false
    for y in 0..<height {for x in 0..<width {if bytes[y*stride+x]>200 {personFound=true;break}};if personFound {break}}
    if personFound {found+=1}
   }
   CVPixelBufferUnlockBaseAddress(buffer,.readOnly)
   let image=CIImage(cgImage:cg),mask=CIImage(cvPixelBuffer:buffer)
   let scaled=mask.transformed(by:CGAffineTransform(scaleX:image.extent.width/mask.extent.width,y:image.extent.height/mask.extent.height))
   let result=image.applyingFilter("CIBlendWithMask",parameters:[kCIInputBackgroundImageKey:CIImage(color:.clear).cropped(to:image.extent),kCIInputMaskImageKey:scaled])
   guard let rgba=context.createCGImage(result,from:image.extent,format:.RGBA8,colorSpace:CGColorSpaceCreateDeviceRGB()),let dest=CGImageDestinationCreateWithURL(output.appendingPathComponent(url.lastPathComponent) as CFURL,UTType.png.identifier as CFString,1,nil) else {throw NSError(domain:"Cutroom",code:3)}
   CGImageDestinationAddImage(dest,rgba,nil);if !CGImageDestinationFinalize(dest){throw NSError(domain:"Cutroom",code:4)}
  } else {
   let request=VNDetectFaceRectanglesRequest();try VNImageRequestHandler(cgImage:cg).perform([request])
   let faces=request.results ?? []
   let face=faces.min {a,b in
    func score(_ f:VNFaceObservation)->Double {let r=f.boundingBox;return found==0 ? -r.width*r.height:pow(r.midX-last.x,2)+pow((1-r.midY)-last.y,2)}
    return score(a)<score(b)
   }
   if let face=face {let box=face.boundingBox,target=CGPoint(x:box.midX,y:1-box.midY);last=found==0 ? target:CGPoint(x:last.x*0.8+target.x*0.2,y:last.y*0.8+target.y*0.2);found+=1}
   keys.append(["frame":Double(index*3),"x":last.x*100,"y":last.y*100])
  }
 }
 print("PROGRESS \(index+1) \(files.count)");fflush(stdout)
}
if mode=="cutout" && found==0 {fputs("No person was detected in this source.\n",stderr);exit(2)}
if mode=="track" {
 if found==0 {fputs("No face was detected in this clip.\n",stderr);exit(2)}
 let data=try JSONSerialization.data(withJSONObject:keys);try data.write(to:output.appendingPathComponent("tracking.json"))
}
