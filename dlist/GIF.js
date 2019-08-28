"use strict"
const fonts=require("./lib/Fonts");
const bufferV2=require("./lib/BufferV2");
const LZWEncoder=require("./lib/LZWEncoder");


class GIF{
    constructor(width,height){
        this.width=width;
        this.height=height;
        this.color=["FFFFFF","0055FF","0066CC","FF2100","00A23D","D1CA00","386D00","027C6C","02477C","69027C"];
        this.background="FFFFFF";
        this.transparentColor=false;
        this.fonts=new fonts();
        this.canvas=[];
        this.canvasFrames=[];
    }
    selectFrames(i){
        this.canvas=this.canvasFrames[i].canvas;
    }
    addFrames(time){
        let cav=[];
        for(let r=0;r<this.height;r++){
            let str=[];
            for(let i=0;i<this.width;i++){
                str.push(this.getColorIndex(this.background));
            }
            cav[r]=str;
        }
        if(typeof time!="number"){
            time=0;
        }
        this.canvasFrames.push({"time":time,"canvas":cav});
        this.selectFrames(this.canvasFrames.length-1);
    }
    setBackground(color){
        color=color.toUpperCase();
        this.pushColor(color);
        this.background=color;
    }
    setTransparentColor(color){
        //设置将颜色索引表中的某个颜色作为透明颜色
        color=color.toUpperCase();
        this.pushColor(color);
        this.transparentColor=color;
    }
    pushColor(color){
        color=color.toUpperCase();
        for(let i=0;i<this.color.length;i++){
            if(this.color==color){
                return this;
            }
        }
        this.color.push(color);
        return this;
    }
    getColorIndex(color){
        color=color.toUpperCase();
        this.pushColor(color);
        for(let i=0;i<this.color.length;i++){
            if(this.color[i]==color){
                return this.lpad(i.toString(16),"0",2);
            }
        }
    }
    lpad(s,p,l){
        s=s.toString();
        if(s.length<l){
            for(let i=0;i<l-s.length;i++){
                s=p+s;
            }
        }
        return s;
    }

    drawText(text,x,y,color){
        let font=this.fonts["get_"+text]();
        let w=font[0].length;
        let h=font.length;

        let index=0;
        let c="";
        for(let i=y;i<h+y;i++){
            c=font[index];
            for(let r=0;r<c.length;r++){
                if(c[r]=="1"){
                    c[r]=this.getColorIndex(color);
                    this.canvas[i].splice(x+r,1,c[r]);
                }

            }

            index++;
        }
        return this;
    }

    getCanvas(){
        return this.canvas;
    }

    Dword(n){
       let s = n.toString("16");
       const st="0000";
       s=st.substr(0,4-s.length)+s;
       s=s.substr(2,2)+s.substr(0,2)
       return s;
    }

    getGlobalColorTable(sl){
        if(typeof sl=="object" && typeof sl.length=="number"){
            sl=sl.length;
        }
        if(sl>0 && sl<=2){
            return 0;
        }else if(sl>2 && sl<=4){
            return 1;
        }else if(sl>4 && sl<=8){
            return 2;
        }else if(sl>8 && sl<=16){
            return 3;
        }else if(sl>16 && sl<=32){
            return 4;
        }else if(sl>32 && sl<=64){
            return 5;
        }else if(sl>64 && sl<=128){
            return 6;
        }else if(sl>128 && sl<=256){
            return 7;
        }
    }

    getImage(){

        let b=new bufferV2(512);//512为初始自己数，系统会自动扩展
        b.appendStr("GIF89a");//文件类型
        b.appendHexStr(this.Dword(this.width));//逻辑屏幕宽度
        b.appendHexStr(this.Dword(this.height));//逻辑屏幕高度
         /*
        1    Global Color Table Flag为全局颜色表标志，即为1时表明全局颜色表有定义。
        111  Color Resolution 代表颜色表中每种基色位长（需要+1），为111时，每个颜色用8bit表示，即我们熟悉的RGB表示法，一个颜色三字节。
        0    Sort Flag 表示是否对颜色表里的颜色进行优先度排序，把常用的排在前面，这个主要是为了适应一些颜色解析度低的早期渲染器，现在已经很少使用了。
        111  Global Color Table 表示颜色表的长度，计算规则是值+1作为2的幂，得到的数字就是颜色表的项数，取最大值111时，项数=256，也就是说GIF格式最多支持256色的位图，再乘以Color Resolution算出的字节数，就是调色盘的总长度。
        000  0  2^(0+1)=2
        001  1 2^(1+1)=4
        010  2 2^(2+1)=8
        011  3 2^(3+1)=16
        100  4 2^(4+1)=32
        101  5 2^(5+1)=64
        110  6 2^(6+1)=128
        111  7 2^(7+1)=256

        1 111 0 111
        */

        let colorSize=this.getGlobalColorTable(this.color);
        b.appendBit("11110"+this.lpad(colorSize.toString(2),"0",3));

        b.appendHexStr(this.getColorIndex(this.background));//为背景颜色(在全局颜色列表中的索引
        b.appendInt(0);//像素宽高比

        //全局颜色列表 添加
        let tmpColor=[];
        for(let i=0;i<Math.pow(2,(colorSize+1));i++){
            if(typeof this.color[i]=="string"){
                tmpColor.push(this.color[i]);
            }else{
                tmpColor.push("000000");
            }
        }

        b.appendHexStr(tmpColor.join(""));
        b.appendHexStr("21FF0B");
        b.appendStr("NETSCAPE2.0");
        b.appendHexStr("0301000000");

        for(let i=0;i<this.canvasFrames.length;i++){
            let cav=this.canvasFrames[i].canvas;
            b.appendHexStr("21F904");
            /*
            disposal method
            disposal method占3Bit，能够表示0-7。
            disposal method = 1
            解码器不会清理画布，直接将下一幅图像渲染上一幅图像上。
            disposal method = 2
            解码器会以背景色清理画布，然后渲染下一幅图像。背景色在逻辑屏幕描述符中设置。
            disposal method = 3
            解码器会将画布设置为上之前的状态，然后渲染下一幅图像。
            disposal method = 4-7
            保留值
             */
            let disposal_method=1;
            //如果图形控制扩展的透明色标志位为1，那么解码器会通过透明色索引在颜色列表中找到改颜色，标记为透明，当渲染图像时，标记为透明色的颜色将不会绘制，显示下面的背景。
            let transparency_color=0;
            if(this.transparentColor){
                transparency_color=1;
            }
            b.appendBit("000"+this.lpad(disposal_method.toString(2),"0",3)+"0"+transparency_color);
            b.appendHexStr(this.Dword(this.canvasFrames[i].time));//延时时间，单位是0.01秒
            if(this.transparentColor){//设置透明颜色
                b.appendHexStr(this.getColorIndex(this.transparentColor));
            }else{
                b.appendHexStr("00");
            }
            b.appendHexStr("00")


            b.appendStr(",");//gif内一张图片的开始
            b.appendHexStr("0000");//X方向偏移量
            b.appendHexStr("0000");//Y方向偏移量

            b.appendHexStr(this.Dword(this.width));//屏幕宽度
            b.appendHexStr(this.Dword(this.height));//屏幕高度
            b.appendHexStr("00");//局部颜色列表标志，因无局部颜色列表，此部分内容不解释
            //b.appendHexStr("07"); //code size

            /*for(let i=0;i<rows.length;i++){
                b.appendHexStr(rows[i]);
            }*/


            let out=new bufferV2(512);
            let carr=[];
            for(let i=0;i<cav.length;i++){
                carr.push(cav[i].join(""))
            }

            for(let i=0;i<carr.length;i++){
                out.appendHexStr(carr[i]);
            }
            let enc = new LZWEncoder(this.width, this.height,out.getBuffer(), colorSize+1);
            out=enc.encode();

            b.appendBuffer(out.getBuffer());
        }


        //b.appendHexStr("80008100");
        b.appendHexStr("3B");

        let img=b.getBuffer();

        return img;
    }
    rand(min, max) {
        return Math.random()*(max-min+1) + min | 0; //特殊的技巧，|0可以强制转换为整数
    }
    setVerificationCode(code){
        /*宽度14 高度19*/
        let pfw=this.width/code.length;
        let randW=pfw-13;
        let randH=this.height-20;

        let tw=0;
        let th=0;
        let tc=0;

        for(let i=0;i<code.length;i++){
            tw=this.rand(0,randW)+(i*pfw);
            th=this.rand(0,randH);
            tw=i*pfw;
            tc=this.rand(1,this.color.length-1);
            this.addFrames(30);
            this.drawText(code.charAt(i),tw,th,this.color[tc]);
        }

    }

}

module.exports = GIF;