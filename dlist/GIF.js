"use strict"
const fonts=require("./lib/Fonts");
const bufferV2=require("./lib/BufferV2");


class GIF{
    constructor(){
        this.width=100;
        this.height=20;
        this.color=["FFFFFF","0055FF","0066CC","ff2100","00a23d","d1ca00","386d00","027c6c","02477c","69027c"];
        this.fonts=new fonts();
        this.resetCanvas();
    }
    resetCanvas(){
        this.canvas=[];
        for(let r=0;r<this.height;r++){
            let str=[];
            for(let i=0;i<this.width;i++){
                str.push("00");
            }
            this.canvas[r]=str;
        }
    }
    setWidth(w){
        this.width=w;
        this.resetCanvas();
        return this;
    }
    setHeight(h){
        this.height=h;
        this.resetCanvas();
        return this;
    }
    setBackground(color){
        this.color[0]=color;
    }
    pushColor(color){
        for(let i=0;i<this.color.length;i++){
            if(this.color==color){
                return this;
            }
        }
        this.color.push(color);
        return this;
    }

    getColorIndex(color){
        for(let i=0;i<this.color.length;i++){
            if(this.color[i]==color){
                return i;
            }
        }
        return 0;
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
                    this.canvas[i].splice(x+r,1,this.lpad(c[r],"0",2));
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

    getImage(){
        /*
        * 图片字节数 固定13字节+图片颜色数*3字节+帧图字节
        * 帧图字节  固定头1字节+尺寸字节9字节+图字节
        * 图字节  （宽度*高度/步长）+宽度*高度
        * */

        let step=10;
        for(let i=0;i<this.canvas.length;i++){
            this.canvas[i]=this.canvas[i].join("");
        }
        let ca=this.canvas.join("");
        let Bits=7;
        let ClearCode= Math.pow(2,7);
        let ChunkMax=Math.pow(2,7)-2;

        let tmpCanvas="";
        for(let i=0;i<ca.length;i=i+(ChunkMax*2)){
            tmpCanvas=tmpCanvas+ca.substr(i,(ChunkMax*2))+ClearCode.toString(16);
        }
        ca=tmpCanvas;

        let rows=[];
        let tmp="";
        let size=0;
        for(let i=0;i<ca.length;i=i+(step*2)){
            tmp=ca.substr(i,(step*2));
            rows.push(this.lpad((tmp.length/2).toString(16),"0",2)+tmp);
        }
        for(let i=0;i<rows.length;i++){
            size+=rows[i].length/2;
        }

        size=size+4
        size=size+10+13+2+(256*3);

        let tmpColor=[];
        for(let i=0;i<256;i++){
            if(typeof this.color[i]=="string"){
                tmpColor.push(this.color[i]);
            }else{
                tmpColor.push("000000");
            }
        }

        let b=new bufferV2(size);
        b.appendStr("GIF89a");//文件类型
        b.appendHexStr(this.Dword(this.width));//逻辑屏幕宽度
        b.appendHexStr(this.Dword(this.height));//逻辑屏幕高度
        b.appendInt(135);//包装域  如1 010 0 001   0-2位001表示全局彩色表大小  3位0表示彩色表排序标志(Sort Flag)域 4-6位010表示彩色分辨率(Color Resolution)域 7位1表示全局彩色表标志(Global Color Table Flag )域
        b.appendInt(0);//为背景颜色(在全局颜色列表中的索引
        b.appendInt(0);//像素宽高比

        //全局颜色列表 添加

        b.appendHexStr(tmpColor.join(""));
        b.appendStr(",");//gif内一张图片的开始
        b.appendHexStr("0000");//X方向偏移量
        b.appendHexStr("0000");//Y方向偏移量

        b.appendHexStr(this.Dword(this.width));//屏幕宽度
        b.appendHexStr(this.Dword(this.height));//屏幕高度
        b.appendHexStr("00");//局部颜色列表标志，因无局部颜色列表，此部分内容不解释
        b.appendHexStr("07");





        for(let i=0;i<rows.length;i++){
            b.appendHexStr(rows[i]);
        }

        b.appendHexStr("80008100");
        b.appendHexStr("3B");

        let img=b.getBuffer();

        //console.log(img);

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
            tc=this.rand(1,this.color.length-1);
            //console.log(code.charAt(i)+"="+tw+"-"+th+"-"+tc);
            this.drawText(code.charAt(i),tw,th,this.color[tc]);
        }

    }

}

module.exports = GIF;