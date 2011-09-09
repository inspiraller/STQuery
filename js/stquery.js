﻿//################################
//ST Query (String Query)
//Author: Steve Tomlin
//Date updated: 2011-09-01_2000
//Version: 0.92 Alpha
//Licence: MIT or GNU
//Works like JQuery but allows selectors on strings instead of elements.
//Requires: HTML must be valid in order for this to work.

//Example:
//strHTML = '<div id="wrapper"><span class="item">item 1</span><br/><span class="item">item 2</span></div>';
//var ST = STQuery(strHTML);
//ST.find('#wrapper .item').html('new text');
//ST.find('br').remove();
//var strHTMLUpdated =  ST.html();
//#################################
(function(){
	var lib = {
        encodeReg:function(str){
            return str.replace(/([^\w\d\s])/gi,'\\'+'$1');
        }
		,trim:function(str){
			return (''+str).replace(/^(\s+|\s+)$/,'');
            //return str.replace(/^\s*([\w\W]*[^\s])\s*$/,'$1');
		}
        ,trimFromSquareBrackets:function(str){
            str = str.replace(/\[\s+/g,'[');
            str = str.replace(/\s+\]/g,']');
            return str;
        }
        ,convertMultipleToSingleWhitespace:function(str){//0.002ms
            //return str.replace(/(\s)\s*([^\s])/g,"$1"+"$2");
            return str.replace(/ {2,}/g,' ');
        }
        ,getRegexParenthesisNumber1:function(str,strMarker,strRegStart,strRegOr,strRegEnd){
        //                                                  \\[\\s*,(match|match),\\s*\\]
        //It builds a regex /[(match1|match2|match3|match4)]/
        //Then returns the number of the matched or statement
            //declare essential vars
			var strQuickCheck = strRegStart+'('+strRegOr+')'+strRegEnd;
			if(str.search(RegExp(strQuickCheck))===-1){return null;}

            var strM = strMarker,
            strNums = '0102030405060708091011121314151617181920',
            p = function(i){
                i = (i < 10)?'0'+i:i;
                return ('\\s*'+strM+'[^'+strM+']*'+i);
            };
            var intP = 1;
            strRegOr = strRegOr.replace(/\|/g,function(){
				var strResult = p(intP)+'|';
				intP=intP+1;
				return strResult;
			});
			strRegOr = strRegOr+p(intP);
            //insert marker and numbers into strSelector, so that the paranthesis match will return a number
            //That number we can use to call the correct index of arrFnFilters
            //arrFnFilters[intFnPos]
            //intFnPos (extract one of these numbers in paranthesis match)
            //                                     ¤010203040506070809101112131415161718¤

            str = str.replace(RegExp('('+strRegEnd+')'),(strM+strNums+strM)+'$1');

            var strRegFilterAll = strRegStart+'('+strRegOr+')[^'+strM+']*'+strM+strRegEnd;

            var regFilterAll = RegExp(strRegFilterAll),
            arrM = regFilterAll.exec(str);

            if(arrM){
                var strMatchOr = ''+arrM[1],
                strNum = strMatchOr.substr(strMatchOr.length - 2),
                intNum = parseInt(strNum) - 1;
				return {intP:intNum,strMatch:strMatchOr}
            }
            return null;
        }
	}
    //MARKERS #####################################################################################
    var ClassMarkers = function(){
        this.strUsedMarkers = '';
        this.objM = {};
        this.strAvailableMarkers = "~¬"+"†‡‰¬¿Þ~`ü¤±Æ¸³¿²ºÿ";

        if(arguments.length > 0){
            var str = arguments[0],strNewMarkerNames=arguments[1];
            this.addMarkers(str,strNewMarkerNames);
        }
    };
    ClassMarkers.prototype = {

        addMarkers:function(str,strNewMarkerNames){
            var strAvailableMarkers = this.strAvailableMarkers,
            objM=this.objM,
            strUsedMarkers = this.strUsedMarkers,
            arrNewMarkerNames = strNewMarkerNames.split(','),
            intNewMarkersLen = arrNewMarkerNames.length,
            intA = 0;
            var strChar;
            while(strAvailableMarkers!==''){
                strChar = strAvailableMarkers.substring(0,1);
                if(str.indexOf(strChar)==-1){
                    objM[arrNewMarkerNames.pop()] = strChar;
                    strUsedMarkers += strChar;
                    ++intA;
                    if(intA === intNewMarkersLen){
                        strAvailableMarkers = strAvailableMarkers.substr(1);
                        break;
                    }
                }
                strAvailableMarkers = strAvailableMarkers.substr(1);
            }
            if(intA < intNewMarkersLen){
                trace('Apparently all of the above markers have been used : ' + strAvailableMarkers);
                return null;
            }
            this.strUsedMarkers = strUsedMarkers;
            this.strAvailableMarkers = strAvailableMarkers;
            return objM;
        }
        ,
        clearRegMarkers:function(str){
            var strUsedMarkers = this.strUsedMarkers;
            str = str.replace(RegExp('['+strUsedMarkers+'](\\d+ )?','g'),'');
            return str;
        }
    };

    //MASKS FOR COMMENTS **************************************************************************************************************
    //MASKS FOR COMMENTS **************************************************************************************************************
    var ClassMasks = function(){
        this.arrMasksMultiple = [];
        this.arrMasksSingle = [];
        this.strMarker = null;
        this.strMarkerMaskName = 'strMarkerMask';

    };
    ClassMasks.prototype = {
        init:function(objMarkers){
            this.objMarkers = objMarkers;
        }
        ,
        mask:function(str){

            //Mask multiples

            //Mask Comments
            var strRegStart = '<'+'!'+'--';
            if(str.indexOf(strRegStart)!==-1){
                str = this.maskEach(str,'COMMENTS',strRegStart,'-->',false);
            }
            //Mask CDATA
            strRegStart = '<![CDATA[';
            if(str.indexOf(strRegStart)!==-1){
                str = this.maskEach(str,'CDATAS',strRegStart,']]>',false);
            }
            //Mask SCRIPTS
            strRegStart = '<'+'script';
            if(str.indexOf(strRegStart)!==-1){
                str = this.maskEach(str,'SCRIPTS',strRegStart+'[^>]*>','<'+'/'+'script'+'>',true);
            }

            //Mask STYLES
            strRegStart = '<'+'style';
            if(str.indexOf(strRegStart)!==-1){
                str = this.maskEach(str,'STYLES',strRegStart+'[^>]*>','<'+'/'+'style'+'>',true);
            }

            //Mask singles
            var arrMasksSingle = [],regStart,strReplace,strContent;
            //XML DECLARATION
            strRegStart = '<'+'?'+'xml';
            if(str.indexOf(strRegStart)!==-1){
                regStart = /<\?xml[^>]*\?>/;
                strReplace = 'strReplaceXmlDec';
                strContent = ''+str.match(regStart);
                str = str.replace(regStart,strReplace);
                arrMasksSingle.push([strContent,strReplace]);
            }

            //DOCTYPE
            strRegStart = '<'+'!'+'DOCTYPE';
            if(str.indexOf(strRegStart)!==-1){
                regStart = /<!DOCTYPE[^>]*>/;
                strReplace = 'strReplaceDocType';
                strContent = ''+str.match(regStart);
                str = str.replace(regStart,strReplace);
                arrMasksSingle.push([strContent,strReplace]);
            }

            this.arrMasksSingle = arrMasksSingle;

            return str;
        }

        ,
        maskEach:function(str,strMaskName,strRegStart,strRegEnd,isMaskInsideTag){
            var strMarker = this.strMarker;
            if(!strMarker){
                var strMarkerMaskName = this.strMarkerMaskName;
                var objM = this.objMarkers.addMarkers(str,strMarkerMaskName);
                strMarker = objM[strMarkerMaskName];
                this.strMarker = strMarker;
            }
            //build arrContent and mask
            var arrContent = [];
            str= str.replace(RegExp('('+strRegEnd+')','g'),'$1' + strMarker);

            var strRegStartEnc = (isMaskInsideTag)?strRegStart:lib.encodeReg(strRegStart);
            var strRegEndEnc = (isMaskInsideTag)?strRegEnd:lib.encodeReg(strRegEnd);

            var strRegStartDetect = (isMaskInsideTag)?'('+strRegStartEnc+')':'()'+strRegStartEnc;
            var strRegEndDetect = (isMaskInsideTag)?'('+strRegEndEnc+')':'()'+strRegEndEnc;

            var strReg=strRegStartDetect+'([^'+strMarker+']*)' + strRegEndDetect + strMarker;
            var regDetect = RegExp(strReg,"g"),
            strArrayInHTML,strSafeChars='';

            str = str.replace(regDetect,function($0,$1,$2,$3){
                strArrayInHTML = strMaskName+"["+(arrContent.length)+"]";
                //strSafeChars = (''+$2).replace(/[\w\W]/g,'*');
                arrContent.push($2);
                var strReturn = $1 + strArrayInHTML + strSafeChars + strMarker + $3;
                return strReturn;
            });
            this.arrMasksMultiple.push([arrContent,RegExp(strMaskName + '\\[(\\d+)\\][^'+strMarker+']*'+strMarker,"g"),[isMaskInsideTag,strRegStart,strRegEnd]]);
            return str;
        }
        ,
        unmask:function(str){
            //collect stored arrays of comments, cdata, scripts
            var arrMasksMultiple = this.arrMasksMultiple,
            arrMasksSingle = this.arrMasksSingle;

            var i,regMask,arrContent;
            //recover multiple masks
            for(i = arrMasksMultiple.length - 1;i>-1;--i){

                var arrWrapperTags = arrMasksMultiple[i][2];
                var isMaskInsideTag = arrWrapperTags[0];
                var strWrapperStart = (!isMaskInsideTag)?arrWrapperTags[1]:'';
                var strWrapperEnd = (!isMaskInsideTag)?arrWrapperTags[2]:'';

                //replace each mask in the order they were created
                regMask = arrMasksMultiple[i][1];
                arrContent = arrMasksMultiple[i][0];
                while(str.search(regMask)!==-1){
                    str = str.replace(regMask,function($0,$1){
                        return strWrapperStart + arrContent[parseInt($1,10)] + strWrapperEnd;
                    });
                }
            }
            var strContent,strRegReturn,regReturn;
            //recover single masks
            for(i = arrMasksSingle.length - 1;i>-1;--i){
                strContent = arrMasksSingle[i][0];
                strRegReturn = arrMasksSingle[i][1];
                regReturn = RegExp(strRegReturn);
                //replace each mask in the order they were created
                str = str.replace(regReturn,strContent);
            }
            return str;
        }
    };
    //###########################################################################################################


    // _STQuery (public)
    var STQuery = function(){
    	var strHTML = (arguments.length > 0)?arguments[0]:'';
        return new _STQuery(strHTML);
    };
    var _STQuery = function(strHTML){
        this.v = "alpha 0.92";
        this.dateStamp = "2011-09-01_2000";
        this.supported = '[attr="value"], bind';
        this.objMarkers = new ClassMarkers();
        this.objMasks = new ClassMasks();

        if(strHTML!=''){
			strHTML = lib.trim(strHTML);
	        this.initMarkers(strHTML);
	        this.strHTML = this.wrapTagPointers(strHTML);
        }
    };
    _STQuery.prototype = {
        shared:{
            intLastWrappedPointer:0
            ,data:{
    	    	/* EXAMPLES:
    	    	,'#strSelector':{
    	    		click:function(evt){
    	    			//do stuff here...
    	    		}
    	    	}*/
    	    }
        }
	    ,dataArrayTrigger:function(strSelector,strEventType){
	    	var arr = this.shared.data[strSelector][strEventType].arr;
			for(var i=0,intLen = arr.length;i < intLen;++i){
				arr[i]();
			};
	    }
        ,initMarkers:function(str){
            //create markers
            var objMarkers = this.objMarkers;
            var objM = objMarkers.addMarkers(str,'strMarkerHandle,strMarkerStart,strMarkerEnd');
        }
        ,wrapTagPointers:function(str){
            //If contains html
            if(str.search(/[<>]/)!==-1){
                var objMarkers = this.objMarkers;
                var objM = objMarkers.objM;

                var strMarkerHandle = objM.strMarkerHandle,
                strMarkerStart = objM.strMarkerStart,
                strMarkerEnd = objM.strMarkerEnd;

                //mask script tags and comments.
                //required to temporarily remove all script and comments while parsing

                var objMasks = this.objMasks;
                objMasks.init(objMarkers);
                str = objMasks.mask(str);

                //loop all tags and wrap with markers
                //set markers
                //convert:     <p></p>
                //to:        �<p></p>`
                str = str.replace(/(<\w+([\s\:][^>]*[^\/])?>)/g, strMarkerStart + "$1");
                str = str.replace(/(<\/\w+([\s\:][^>]*)?>)/g,"$1"+strMarkerEnd);

				//test if html is badly formed:
				var regBadHTML = new RegExp('([^'+strMarkerStart+']<[^\/]([^>]*[^\/]>)?>|<\/[^>]*>[^'+strMarkerEnd+'])');
				//var regBadHTML = new RegExp('[^'+strMarkerStart+']<[^\/]([^>]*[^\/])?>');

				if(str.search(regBadHTML)!=-1){
					var arrM = regBadHTML.exec(str),
					intIndex = arrM.index,
					strExtract = str.substring(0,intIndex),
					arrLineNumber = strExtract.split(/\n/);

					var intLineNumber = arrLineNumber.length;
					var intChar = arrLineNumber[intLineNumber - 1].length;

					trace('HTML not well formed. Tags not properly opened and closed:');
					trace('intLineNumber ='+intLineNumber);
					trace('intChar ='+intChar);
					trace('strGoodHTML='+strExtract);
					trace('strBadHTML='+str.substr(intIndex));
					return '';
				}

                //Loop through each wrapped tag and add a handle marker around it. Example:
                //search: �(<(tag) >...</(tag)>)`
                //replace with: ¬1 <(tag) >...</(tag)>¬1
                //replace with: ¬2 <(tag) >...</(tag)>¬2
                //replace with: ¬3 <(tag) >...</(tag)>¬3
                //etc...

                var shared = this.shared;
                var intC = shared.intLastWrappedPointer,
                regI = RegExp(strMarkerStart+"(<[^\\/][^"+strMarkerStart+strMarkerEnd+"]*[^\\/]>)"+strMarkerEnd,'g');
                var fnReplace = function(){
                    var arg = arguments;
                    var strA = ((strMarkerHandle + intC + ' ') +  arg[1] + (strMarkerHandle + intC + ' '));
                    ++intC;
                    return strA;
                }
                //wrap uncollapsed tags
                while(str.search(regI)!== -1) {str = str.replace(regI,fnReplace);}

                //wrap collapsed/self closing tags
                str = str.replace(/(\<[^>]*\/>)/g,fnReplace);

                //keep a note of the last pointer added for further wrapping of tags.
                shared.intLastWrappedPointer = intC;
                //required
                str = objMasks.unmask(str);
            }else{
                //not valid, firebug would show errors.
                trace('You have not supplied any html!');
            }
            return str;
        }
		,replaceMarkers:function(str,strOldMarker,strNewMarker){
			return str.replace(RegExp(strOldMarker+'(\\d+ )','g'),strNewMarker+'$1');
		}
        ,
        removeTagPointers:function(str){
            var strMarkerHandle = this.objMarkers.objM['strMarkerHandle'];
            str = str.replace(RegExp(strMarkerHandle+'\\d+ ','g'),'');
            str = str.replace(RegExp(strMarkerHandle,'g'),'');
            return str;
        }
		,incrementTagPointers:function(str,strMarkerHandle){
			var intInc = this.shared.intLastWrappedPointer;
			return str.replace(RegExp('('+strMarkerHandle+'(\\d+) )([\\w\\W]*)\\1','g'),function($0,$1,$2,$3){
				var strInc = strMarkerHandle + intInc + ' ' + $3	+ strMarkerHandle + intInc + ' ';
				++intInc;
				return strInc;
			});
			this.shared.intLastWrappedPointer = intInc;
			return str;
		}
        ,renewAndWrapTagPointers:function(strNew){
            var strHTMLOutput = this.html(),
            objNewMarkers = new ClassMarkers(strHTMLOutput+strNew,'strMarkerHandle,strMarkerStart,strMarkerEnd'),
            strOldMarkerHandle = this.objMarkers.objM['strMarkerHandle'],
            strNewMarkerHandle = objNewMarkers.objM['strMarkerHandle'];
            this.strHTML = this.replaceMarkers(this.strHTML,strOldMarkerHandle,strNewMarkerHandle);
            this.objMarkers = objNewMarkers;
            strNew = this.wrapTagPointers(strNew);
            return strNew;
        },
        find:function(){
            var objItem = new _STQueryItem(this);
            var strSelectors = arguments[0];
            return objItem.find(strSelectors);
        },
        html:function(){
            var strHTML = this.strHTML;
            strHTML = this.objMarkers.clearRegMarkers(strHTML);
            return strHTML;
        }
        ,top:function(){
            var objItem = new _STQueryItem(this);
            return objItem.top();
        }
    };

    //###########################################################################################################

    // _STQueryItem (private)
    var _STQueryItem = function(objInst){//,arguments...
        this.objInst = objInst;
    };
    _STQueryItem.prototype = {
        arrPointers:[]
        ,objInst:{}
        ,objFindFn:{
            parseSelectors:function(str){
                //str = lib.trim(str);
                str = lib.convertMultipleToSingleWhitespace(str);
                str = lib.trimFromSquareBrackets(str);
                return str;
            }
            ,findAllCommas:function(strSelectors,strHTML,arrPointers,objInst){//0.108ms slowest...
                var _top = _STQueryItem.prototype,
                arrResetPointers,
                strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'];

                //convert multiple whitespace to a single space
                strSelectors = this.parseSelectors(strSelectors);

                //get start Extract.
                //if arrPointers exist, then begin with an extract from the startPointer


                var strStartExtract = strHTML;
                if(arrPointers.length){
                    var strStartPointer = arrPointers[0];
                    strStartExtract = _top.extract(strMarkerHandle,strStartPointer,strHTML);
                }
                var arrExtractDefault = [strStartExtract],
                arrSelComma = strSelectors.split(','),
                arrCommaPointers = [];

                //iterate each comma
                for(var c=0,intLenComma = arrSelComma.length;c < intLenComma;++c){

                    //split spaces
                    arrResetPointers = this.findCollatedSpaced(arrSelComma[c],arrExtractDefault,strMarkerHandle);
                    arrCommaPointers = arrCommaPointers.concat(arrResetPointers);
                }
                //finally collect the last pointers
                //reverse the array, so that the deepest items are at the beginning.
                //This is so that if a developer sets the html of an item inside an item,
                // the deepest item is changed first, then the outer item overwrites it

                // and no error is created due to not finding the item.

                arrCommaPointers = arrCommaPointers.reverse();

                return arrCommaPointers;
            }
            ,parseSelector:function(str){
                var regSquare = /\[([^\]]*)\]/g,//  .someClass[ name|="value" ]
                regDirect = /([>\~\+])¤+/g;//       .someClass > .immediateChild
                                           //       .someClass + .nextChild
                                           //       .someClass ~ .prevChild
                str = lib.trim(str);
                if(str.search(regSquare)==-1 && str.search(regDirect)==-1){
                    return str.split(' ');
                }else{
                    str = str.replace(/ /g,'¤');

                    //maintain spaces in square brackets. Don't split these as seperate selectors
                    str = str.replace(regSquare,function($0,$1){return '['+$1.replace(/¤/g,' ')+']'});
                    //maintain spaces after markers like >,~,+ because the following selectors are direct descendants of these.
                    str = str.replace(regDirect,function($0,$1){return $1 + ' '});
                    
                    return str.split(/¤+/g);
                }
            }
    
            ,regOr:function(str){
                return RegExp('(['+str+'])');
            }
            ,regNot:function(str){
                return RegExp('([^'+str+'])');
            }
            ,findCollatedSpaced:function(strSelectorComma,arrExtractDefault,strMarkerHandle){//0.09ms

                //iterate over every spaced selectors
                //strSelectorComma = strSelectorComma.replace(/(\[[^\]]*\]/g,'$1');
				var arrSelectors = this.parseSelector(strSelectorComma),
                arrExtract = arrExtractDefault,
                arrResetPointers,
                _top = _STQueryItem.prototype,
                arrPreFiltered = null,
                regStartChar = /[^\#\.>\+\~\[\:]/;

                //iterate each spaced selector
                for(var s=0,intLenSelectors = arrSelectors.length;s < intLenSelectors;++s){
                    var strSelector = arrSelectors[s];

                    //get first character of strSelector. TAG, ID, CLASS, [ : > ~ + etc...
                    var strStartChar = this.extractStartChar(strSelector,regStartChar);

                    //update selector
                    strSelector = (strStartChar!=='TAG')?strSelector.substr(1):strSelector;

                    //reset arrResetPointers                    
                    var arrResetExtract = [];
                    arrResetPointers = [];

                    //loop each extract
                    for(var e=0,intLenExtract = arrExtract.length;e < intLenExtract;++e){
                        //collect each matched selector                        
                        var strEachExtractHTML = arrExtract[e],
                        arrTempPointers = this.findMultipleSelectors(_top, strStartChar, strSelector, strEachExtractHTML, strMarkerHandle, arrPreFiltered);

                        if(!arrTempPointers){return [];}
                        //build new extract list from each selector
                        for(var p=0,intLenPointers = arrTempPointers.length;p < intLenPointers;++p){
                            var strPointer = arrTempPointers[p];

//store strSelector against strPointer number
_top.selectors[strPointer] = strSelector;

                            if(strPointer=='' || strPointer=='>'){continue;}
                            //for each selector create a new extract list to loop in next iteration.
                            arrResetExtract.push(_top.extract(strMarkerHandle,strPointer,strEachExtractHTML));
                        }

                        //reset pointers to last matched items
                        arrResetPointers = arrResetPointers.concat(arrTempPointers);
                    }
                    arrExtract = arrResetExtract;

                }
                return arrResetPointers;
            }
            ,extractStartChar:function(strSelector,regStartChar){
                var strStartChar = strSelector.charAt(0);
                strStartChar = strStartChar.replace(regStartChar,'TAG');
                return strStartChar;
            }
            ,findMultipleSelectors:function(_top,  strStartChar, strSelector, strHTML, strMarkerHandle, arrPreFiltered){//0.048ms
                //extract first part of the selector
                //strSelector = 'TAG[1]#someID.someClass'

                var strFirstSelector = this.extractFirstSelector(strSelector);
                //strFirstSelector = 'TAG[1]'
                var intPredicate= this.getPredicate(strSelector);
                //intPredicate = 1

                var strCropFirstSelector = this.cropFirstSelector(strStartChar,strFirstSelector);                
                //strCropFirstSelector = 'TAG'

                //match points against strFirstSelector
                var arrPointers = this.selectorChoice[strStartChar].apply(this,[_top, strHTML, strMarkerHandle, arrPreFiltered, strCropFirstSelector, intPredicate]);

                //get remaining selectors
                var strRemainingSelectors = '';

                if(strFirstSelector!=''){
                    //strFirstSelector = 'TAG[1]'
                    var intIndexNext = strFirstSelector.length;
                    if(intPredicate===null && strStartChar!='[' && strStartChar!=':'){
                        var intNextChar = strSelector.search(/[\#\.\:\[]/);
                        intIndexNext = (intNextChar!=-1)?intNextChar:strSelector.length;
                    }
                    strRemainingSelectors = strSelector.substr(intIndexNext);
                    //strRemainingSelectors = '#someID.someClass'
                }

                //repeat function to filter #item.multipleClass:button etc...
                if(strRemainingSelectors.length!='' && arrPointers.length!==0){
                    var strNextStartChar = strRemainingSelectors.charAt(0);
                    //strNextStartChar = '#'

                    strRemainingSelectors = (strNextStartChar=='.' || strNextStartChar=='#')?strRemainingSelectors.substr(1):strRemainingSelectors;
                    
                    //strRemainingSelectors = 'someID.someClass'

                    arrPointers = this.findMultipleSelectors(_top, strNextStartChar, strRemainingSelectors, strHTML, strMarkerHandle, arrPointers);                    
                }

/*
trace(' ');
trace('findMultipleSelectors()');
trace('strFirstSelector='+strFirstSelector);
trace('intPredicate='+intPredicate);
trace('strCropFirstSelector='+strCropFirstSelector);
trace('strStartChar='+strStartChar);
trace('strRemainingSelectors='+strRemainingSelectors);
trace('strNextStartChar='+strNextStartChar);
*/
                return arrPointers;
            }
            ,extractFirstSelector:function(strSelector){

                var intIndexNextChar = strSelector.search(/[\#\.\[\(]/),
                strNextChar = strSelector.charAt(intIndexNextChar);
                if(strNextChar=='('){
                    //strSelector = 'TAG:contains(:eq(1)).someClass'

                    return this.getMultipleParenthesis(strSelector);
                   //return 'TAG:contains(:eq(1))'

                }else if(strNextChar==='['){
                    //strSelector = 'TAG[1].someClass'
                    return strSelector.substring(0,strSelector.indexOf(']')+1);
                    //return 'TAG[1]'
                }else if(intIndexNextChar==-1){
                     return strSelector;
                }else{
                    //strSelector = 'TAG#someId'
                    return strSelector.substring(0,intIndexNextChar);
                    //return 'TAG';
                }
                return null;

                //extract selector from #id.class[asdf~]:asdf(asdf)
                //[name|="value"]
                //[name*="value"]
                //[name~="value"]
                //[name$="value"]
                //[name="value"]
                //[name^="value"]
                //[name!="value"]
                //:eq()
                //:gt()
                //:first-child
                //:has(selector)
                //:not(selector)
                //:nth-child()
                //:not(:contains);
                //:contains()
            }
            ,getMultipleParenthesis:function(strSelector){
                 //extract (((( ))))
                var regP = /([\(\)])/g,
                arrM,intP=0,intIndex = 0;
                while(arrM = regP.exec(strSelector)){
                    intP = (intP + (arrM[1]=='(')?1:-1);
                    if(intP < 1){break;}
                }
                return strSelector.substring(0,regP.lastIndex);
            }
            ,cropFirstSelector:function(strStartChar,strFirstSelector){
                //converts TAG[1]
                //to TAG     

                //or [1]
                //to [1]
                if(strStartChar=='[' || strStartChar==':'){
                    return strFirstSelector;
                }else{
                    var intNextStartChar = strFirstSelector.search(/[\:\[]/),
                    intEnd = (intNextStartChar===-1)?strFirstSelector.length:intNextStartChar;
                    return strFirstSelector = strFirstSelector.substring(0,intEnd);
                }
            }
            ,getPredicate:function(strFirstSelector){

                strFirstSelector = this.cropForPredicate(strFirstSelector);
                //extract arrFilterSelectors to get a number from either square brackets [3] or :eq(3) etc...
                var strRegPred = '(\\[|\\:eq\\()(\\d+)(\\]|\\))';
                var regPred = RegExp(strRegPred);
                var arrM = regPred.exec(strFirstSelector);
                if(arrM){
                    var intPred = parseInt(arrM[2]);
                    return intPred;
                }
                return null;
            }
            ,cropForPredicate:function(strSelector){
                var intNextChar = strSelector.search(/[\.\#]/);
                var intEnd = (intNextChar!==-1)?intNextChar:strSelector.length;
                return strSelector.substring(0,intEnd);
            }
            ,selectorChoice:{
                '#':function(_top){
                     return _top.objFindFn['findId'].apply(this,arguments);
                }
                ,'.':function(_top){
                     return _top.objFindFn['findClasses'].apply(this,arguments);
                }
                ,':':function(_top){
                    return _top.objFindFn['findColons'].apply(this,arguments);
                }
                ,'[':function(_top){
                    return _top.objFilterPredicate.filterPredicate.apply(_top.objFilterPredicate,arguments);                    
                }
                ,'>':function(_top){
                    return _top.objFindFn['findImmediateChild'].apply(this,arguments);
                }
                ,'+':function(_top){
                    return _top.objFindFn['findBeforeNext'].apply(this,arguments);
                }
                ,'~':function(_top){
                    return _top.objFindFn['findAfterPrev'].apply(this,arguments);
                }
                ,'TAG':function(_top){
                     return _top.objFindFn['findTags'].apply(this,arguments);
                }
            }
            ,findId:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart){//0.013ms
                var arrPointers = [];
                //match againts previously filtered items only.
                if(arrPreFiltered!==null){
                    var strReg = '<[^>]*id="'+strSelectorStart+'"';
                    strReg = this.regexAgainstPrefiltered(strMarkerHandle, arrPreFiltered, strReg);
                    arrPointers = this.matchAgainstPreFiltered(strHTML, strMarkerHandle, strReg, null, arrPreFiltered);
                }else{//match single id
                    var intIndex = strHTML.indexOf('id="'+strSelectorStart+'"');
                    if(intIndex!=-1){
                        var strE = strHTML.substring(0,intIndex),
                        intHandle = strE.lastIndexOf(strMarkerHandle);
                        strE = strE.substr(intHandle);
                        
                        var strPointer = strE.substring(1,strE.indexOf(' '));
                        arrPointers.push(strPointer);
                    }
                }
                return arrPointers;
            }
            ,findTags:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart, intPredicate){

                var strReg = '<'+strSelectorStart+'[\\s\\:\\/>]',
                arrPointers = [];
                if(arrPreFiltered!==null){
                    arrPointers = this.matchAgainstPreFiltered(strHTML, strMarkerHandle, strReg, intPredicate, arrPreFiltered);
                }else{
                    arrPointers = this.iterateEachPointer(strHTML, strMarkerHandle, strReg, intPredicate);
                }                            
                return arrPointers;
            }

            ,findClasses:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart, intPredicate){
                var strReg = '<[^>]*class="?[^"]*["\\s]'+strSelectorStart+'["\\s]',
                arrPointers = [];
                if(arrPreFiltered!==null){
                    arrPointers = this.matchAgainstPreFiltered(strHTML, strMarkerHandle, strReg, intPredicate, arrPreFiltered);
                }else{
                    arrPointers = this.iterateEachPointer(strHTML, strMarkerHandle, strReg, intPredicate);
                }
                return arrPointers;
            }
            ,iterateEachPointer:function(strHTML, strMarkerHandle, strReg, intPredicate){
                var arrPointers = [],
                regMatchMultiple = RegExp(strReg,'g');
                var arr = strHTML.split(regMatchMultiple);

                if(arr[0].lastIndexOf(strMarkerHandle)==-1){return [];}

                if(intPredicate!==null){
                    var strItem = arr[intPredicate];
                    if(strItem){
                        strPointer = this.getIPointer(strItem,strMarkerHandle);
                        return [strPointer];
                    }
                }else{
                    for(var i=0,intLen = (arr.length - 1); i < intLen;++i){
                        var strPointer = this.getIPointer(arr[i],strMarkerHandle);
                        arrPointers.push(strPointer);
                    }
                }
                return arrPointers;
            }
            ,matchAgainstPreFiltered:function(strHTML, strMarkerHandle, strReg, intPredicate, arrPreFiltered){//0.04
                var arr = [];
                var regMatch = RegExp(strMarkerHandle + '('+arrPreFiltered.join('|') + ') ' + strReg,'g'),
                arrM,intI=0;
                while(arrM = regMatch.exec(strHTML)){
                    if(intPredicate){
                        if(intI===intPredicate){arr.push(arrM[1]); return arr;}
                    }else{
                        arr.push(arrM[1]);
                    }
                    ++intI;
                }
                return arr;
            }
            ,getIPointer:function(strItem,strMarkerHandle){
                var intLastInd = strItem.lastIndexOf(strMarkerHandle),
                strItem2 = strItem.substr(intLastInd),
                strPointer = strItem2.substring(1,strItem2.indexOf(' '));
                return strPointer;
            }
        }

        ,objFilterPredicate:{
            //#####################################################
            //filtering by predicate .selector[1] or h1[4] etc...
            //or id, or class etc...

            filterPredicate:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart){
              //Note: This function doesn't actually do any filtering itself
                //It builds a regex /[(match1|match2|match3|match4)]/
                //Then returns the correct function according to the parenthesis match

                //NOTE: filterHasAttr and filterAttrContains are yet to be coded, so currently won't be filtered.
                //but no error will be returned, it will simply filter all other matches and return the result
                var strRegOr = '\\w+|\\w+\\=\\"[^\\"]*\\"',
                strFnFilter = 'filterHasAttr,filterAttrEquals';

                var objFn = lib.getRegexParenthesisNumber1(strSelectorStart,'¤','\\[\\s*',strRegOr,'\\s*\\]');
                if(objFn){
                    var intFn = objFn.intP;
                    var strMatch = objFn.strMatch;

                    var arrFnFilter = strFnFilter.split(',');
                    var strFn = arrFnFilter[intFn];
                    return this[strFn].apply(this,arguments);
                }
                return null;
            }

			//###############################################################
			//filter options
            ,filterHasAttr:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart){
                //requires coding...
                return [];
            }
            ,filterAttrEquals:function(_top, strHTML, strMarkerHandle, arrPreFiltered, strSelectorStart){
                //requires coding...
                var strRegKeyValue = '(\\w+)\\=\\"([^\\"]*)\\"',
                regKeyValue = RegExp(strRegKeyValue),
                arrM = regKeyValue.exec(strSelectorStart);
                
                var strKey = arrM[1],
                strValue = arrM[2];
                var strReg = '<[^>]*'+strKey+'\\=\\"'+strValue+'"';
                var arrPointers = _top.objFindFn.matchAgainstPreFiltered(strHTML, strMarkerHandle, strReg, null, arrPreFiltered)

                return arrPointers;
            }

        }
		,find:function(strSelectors){//0.123ms
			var strHTML = this.objInst.strHTML,
            objInst = this.objInst;
			this.arrPointers = this.objFindFn.findAllCommas(strSelectors,strHTML,this.arrPointers,objInst);
            return this;
		}

        ,extract:function(strMarkerHandle,strPointer,strHTML){
            if(strPointer!==''){
                var strRegPointer = strMarkerHandle + strPointer + ' ';
                if(strHTML.indexOf(strRegPointer)!==-1){
                    strHTML = strHTML.substring(strHTML.indexOf(strRegPointer),strHTML.lastIndexOf(strRegPointer)+strRegPointer.length);
                }else{
                    trace('Note: strPointer: \''+strPointer+'\' does not exist');
                }
            }
            return strHTML;
        }
        ,regexEach:function(strHTML,strRegF,fnReplace,strFirstLastAll,arrAddAttr){
            var objInst = this.objInst,
            arrPointers = this.arrPointers,
            strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'],
            i=0,
            intLen = arrPointers.length,
            strPointer,strRegPointer;

            if(intLen && strFirstLastAll!=='all'){
                if(strFirstLastAll==='first'){
                    i=intLen - 1; //get only the first item. Remember arrPointers is reversed.
                }else{
                    intLen = 1;
                }
            }
            var getStrRegElem = function(i){
                strPointer = arrPointers[i];
                strRegPointer = (strMarkerHandle + strPointer + ' ');
                return '('+strRegPointer + strRegF + strRegPointer+')';
            };

            var strRegElem;
            //if attribute does not exist, and arrAddAttr ==true, then add the attribute.
            if(arrAddAttr){
                for(;i < intLen;++i){
                    strRegElem = getStrRegElem(i);
                    var regElem = RegExp(strRegElem,'g');
                    if(strHTML.search(regElem)!==-1){
                        strHTML = strHTML.replace(regElem,function(){
                            return fnReplace(arguments);
                        });
                    }else{
                        var strRegAddAttr = '('+strRegPointer + '<[^>]*)>';
                        var regAddAttr = RegExp(strRegAddAttr,'');
                        strHTML = strHTML.replace(regAddAttr,'$1 '+arrAddAttr[0]+'="'+arrAddAttr[1]+'">');
                    }
                }

            }else{
                //if not adding the attribute, then just replace the matches.
                for(;i < intLen;++i){
                    strRegElem = getStrRegElem(i);
                    strHTML = strHTML.replace(RegExp(strRegElem,'g'),function(){return fnReplace(arguments);});
                }
            }
            return strHTML;
        },
        regexAttr:function(strName,strValue,strRegF,fnReplace,strFirstLastAll,isAdd){

            var objInst = this.objInst;
			strName = lib.trim(strName);
            strValue = lib.trim(strValue);
            var arrAddAttr = (isAdd)?[strName,strValue]:null;

            objInst.strHTML = this.regexEach(objInst.strHTML,strRegF,fnReplace,strFirstLastAll,arrAddAttr);
        }
        //append / prepend / before / next / html
        ,regexElem:function(strNew,strRegF,fnReplace,strFirstLastAll){
            var objInst = this.objInst;
			strNew = lib.trim(strNew);
            //var strRegAppendOrPrepend = (isPrepend)?'<[^>]*>)([\\w\\W]*<\/[^>]*>':'<[^>]*>[\\w\\W]*)(<\/[^>]*>';
            if(strNew.indexOf('<')!=-1){
                //wrap tag pointers before adding.
                strNew = this.objInst.renewAndWrapTagPointers(strNew);
            }
            objInst.strHTML = this.regexEach(objInst.strHTML,strRegF,fnReplace,strFirstLastAll,null);
            //set arrPointers to the last wrapped pointer.
            this.arrPointers = [objInst.shared.intLastWrappedPointer - 1];
            return this;
        }
        ,wrapNew:function(strNew){
            strNew = ''+strNew;
            if(strNew.indexOf('<')!=-1){
                //wrap tag pointers before adding.
                strNew = this.objInst.renewAndWrapTagPointers(strNew);
            }
            return strNew;
        }
         ,
        append:function(strNew){
        	var _parent = this;
            return this.regexElem(strNew,'<[^>]*>[\\w\\W]*)(<\\/[^>]*>',function(arg){
                return arg[1] + _parent.wrapNew(strNew) + arg[2];
                },'all');
        }
        ,
        prepend:function(strNew){
        	var _parent = this;
            return this.regexElem(strNew,'<[^>]*>)([\\w\\W]*<\\/[^>]*>',function(arg){
                return arg[1] + _parent.wrapNew(strNew) + arg[2];
                },'all');
        }
        ,
        before:function(strNew){
        	var _parent = this;
            return this.regexElem(strNew,'[\\w\\W]*',function(arg){
                return _parent.wrapNew(strNew) + arg[1];
                },'all');
        }
        ,
        after:function(strNew){
        	var _parent = this;
            return this.regexElem(strNew,'[\\w\\W]*',function(arg){
                return arg[1] + _parent.wrapNew(strNew);
                },'all');
        }
        ,getOuterHTML:function(){//,fnParse //0.028
            var fnParse = (arguments.length > 0)?arguments[0]:function(str){return str;},
            objInst = this.objInst,
            strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'],
            strHTML = objInst.strHTML,
            arrPointers = this.arrPointers,strPointer,strRegPointer,strExtract,
            strReturn = '';

            //return html
            for(var i=0,intLen = arrPointers.length;i < intLen;++i){
                strPointer = arrPointers[i];
                strRegPointer = (strMarkerHandle + strPointer + ' ');
                strExtract = strHTML.substring(strHTML.indexOf(strRegPointer) + strRegPointer.length,strHTML.lastIndexOf(strRegPointer));
                //parse to get innerHTML
                strExtract = fnParse(strExtract);                
                strReturn = (strReturn + strExtract);
            }
            strReturn = strReturn.replace(RegExp(strMarkerHandle+'\\d+ ','g'),'');
            return strReturn;
        }
        ,
        html:function(){
            var _parent = this;
            var strNew = (arguments.length > 0)?arguments[0]:null;
            if(strNew){
                return this.regexElem(strNew,'<[^>]*>)[\\w\\W]*(<\\/[^>]*>',function(arg){

                    return arg[1] + _parent.wrapNew(strNew) + arg[2];
                },'all');
            }else{
                var strCurrentHTML = this.getOuterHTML(function(str){
                    return str = str.substring(str.indexOf('>')+1,str.lastIndexOf('</'));
                });
                return strCurrentHTML;
            }
        },
        outerHtml:function(){
            var _parent = this;
            var strNew = (arguments.length > 0)?arguments[0]:null;
            if(strNew){
                return this.regexElem(strNew,')(<[^>]*>[\\w\\W]*<\\/[^>]*>|<[^>]*\\/>)(',function(arg){
                    return arg[1] + _parent.wrapNew(strNew) + arg[3];
                },'all');
            }else{
                var strCurrentHTML = this.getOuterHTML();
                return strCurrentHTML;
            }
        }
        ,outerHTML:function(){
            var strNew = (arguments.length > 0)?arguments[0]:null;
            return this.outerHtml(strNew);
        }
		,clone:function(){
			return this.html();
		}
        ,
        appendSibling:function(){
            var objInst = this.objInst;
            var strMarkerHandle = this.objInst.objMarkers.objM['strMarkerHandle'];
            return this.regexElem('','[\\w\\W]*',function(arg){
                var strClone = arg[1];
                strClone = objInst.incrementTagPointers(strClone,strMarkerHandle);
                return arg[0] + strClone;
            },'last');
        }
        ,
        attr:function(strName){
            var strValue = (arguments.length > 1)?arguments[1]:null;
            var isAdd = (strValue);
            if(strValue){
                this.regexAttr(strName,strValue,'<[^>]*'+strName+'="?)[^"]*([\\w\\W]*"',function(arg){
                    return arg[1] + strValue + arg[2];
                    },'all',isAdd);
                return this;
            }else{
                var arrPointers = this.arrPointers;
                if(arrPointers.length){
                    var strHTML = this.objInst.strHTML;
                    var strPointer = arrPointers[0];
                    var strMarkerHandle = this.objInst.objMarkers.objM['strMarkerHandle'];
                    var strRegPointer = strMarkerHandle + strPointer + ' ';
                    var strExtract = strHTML.substring(strHTML.indexOf(strRegPointer) + strRegPointer.length,strHTML.lastIndexOf(strRegPointer));
                    var regAttr = RegExp('<[^>]*'+strName+'="?([^"]*)"','');
                    var arrM = regAttr.exec(strExtract);
                    if(arrM){
                        return arrM[1];
                    }
                }
            }
            return null;
        }
        ,
        id:function(strId){
            var strValue = strId;
            this.regexAttr('id',strId,'<[^>]*id="?)[^"]*("[\\w\\W]*',function(arg){
                return arg[1] + strValue + arg[2];
                },'first',true);
        }
        ,
        addClass:function(strClass){
            this.regexAttr('class',strClass,'<[^>]*class="?)([^"]*)("[\\w\\W]*',function(arg){
                return arg[1] + arg[2] + ' ' +strClass + arg[3];
            },'all',true);
        }
		//remove functions:
		,remove:function(){
		   return this.regexElem('','[\\w\\W]*',function(arg){
				return '';
		   },'all');
		   return this;
		}
		,empty:function(){
		   return this.regexElem('','<[^>]*>)[\\w\\W]*(<\\/[^>]*>',function(arg){
				return arg[1] + arg[2];
		   },'all');
		   return this;
		}
		,removeClass:function(strClass){
            this.regexAttr('class',strClass,'<[^>]*class="?[^"]*[" ])'+strClass+'([ "][\\w\\W]*',function(arg){
                return arg[1] + arg[2];
            },'all',true);
			return this;
		}
		,removeAttr:function(strName){
		   this.regexAttr(strName,'','<[^>]*)'+strName+'="?[^"]*"([\\w\\W]*',function(arg){
				return arg[1] + arg[2];
			},'all',false);
			return this;
		}
		,objParentFn:{
			getEachParentPointer:function(strMarkerHandle,strPointer,strHTML){
				var strRegOpenClosed = '('+strMarkerHandle+'\\d+ )[\\w\\W]*\\1',
				regOpenClosed = RegExp(strRegOpenClosed,'g');
				strHTML = strHTML.substring(0,strHTML.indexOf(strMarkerHandle + strPointer + ' '));
				strHTML = strHTML.replace(regOpenClosed,'');

				var strRegParent = strMarkerHandle+'(\\d+) <[^\\/][^>]*>\\s*$',
				regParent = RegExp(strRegParent);

				var arrM = regParent.exec(strHTML);
				if(!arrM){return null;}

				var strEachParentPointer = arrM[1];

				return strEachParentPointer;
			}
			//iterate between getClosestPointer and getTraversedParentPointer;
			//The reason these 2 functions are split is to allow testing of self
			,getTraversedParentsPointer:function(strMarkerHandle,strPointer,strJoinedParentPointers,strHTML){
				var strEachParentPointer = this.getEachParentPointer(strMarkerHandle,strPointer,strHTML);
                if(!strEachParentPointer){return null;}
				return this.getClosestPointer(strMarkerHandle,strPointer,strJoinedParentPointers,strHTML,strEachParentPointer);
			}
			,getClosestPointer:function(strMarkerHandle,strPointer,strJoinedParentPointers,strHTML,strEachParentPointer){
				//get parent extract
				var isParentHasSelector = (strJoinedParentPointers.indexOf(','+strEachParentPointer+',')!=-1);
				if(!isParentHasSelector){
					return this.getTraversedParentsPointer(strMarkerHandle,strEachParentPointer,strJoinedParentPointers,strHTML);
				}else{
					return strEachParentPointer;
				}
			}
			//test if pointer is a self match
			,getSelfPointer:function(strMarkerHandle,strPointer,strJoinedParentPointers,strHTML){
				return this.getClosestPointer(strMarkerHandle,strPointer,strJoinedParentPointers,strHTML,strPointer);
			}
			,getSingleParentPointer:function(strMarkerHandle,strPointer,strHTML){
				return this.getEachParentPointer(strMarkerHandle,strPointer,strHTML);
			}
		}
        ,parents:function(){
            var	intArgLen = arguments.length,
            strParentsSelectors = (intArgLen > 0)?arguments[0]:null,
			isIncludingSelf = (intArgLen >1)?true:false,
			strJoinedParentPointers = null,
            objInst = this.objInst,
            strHTML = objInst.strHTML;

			//1) get all pointer matches to test against each parent
			if(strParentsSelectors){
				var arrFoundPointers = this.objFindFn.findAllCommas(strParentsSelectors,strHTML,[],objInst);
				strJoinedParentPointers = ','+arrFoundPointers.join(',')+',';
			}
            var strMarkerHandle = this.objInst.objMarkers.objM['strMarkerHandle'];
			//append end tags just to allow the regex to catch the top <html> if someone supplies it as a selector
            strHTML = strHTML+'<allowtop></allowtop>';

            //2) iterate each pointer
            var arrNewPointers = [],
            arrExistingPointers = this.arrPointers,
			objParentFn = this.objParentFn;
            for(var i=0,intLen = arrExistingPointers.length;i < intLen;++i){
                //3) get parent;
                var strExistingPointer = arrExistingPointers[i];
				var strParentPointer = null;
				if(!intArgLen){
                	strParentPointer = objParentFn.getSingleParentPointer(strMarkerHandle,strExistingPointer,strHTML);
				}else{
					if(!isIncludingSelf){
						strParentPointer = objParentFn.getTraversedParentsPointer(strMarkerHandle,strExistingPointer,strJoinedParentPointers,strHTML);
					}else{
						strParentPointer = objParentFn.getSelfPointer(strMarkerHandle,strExistingPointer,strJoinedParentPointers,strHTML);
					}
				}
                if(strParentPointer){
                    //4) populate new pointers
                    arrNewPointers.push(strParentPointer);
                }
            }
            this.arrPointers = arrNewPointers;
            return this;
        }
        ,
        parent:function(){
            return this.parents();
        }
        ,
        closest:function(strSelector){
            return this.parents(strSelector,true);
        }
        ,top:function(){
            var objInst = this.objInst,
            strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'],
            regexTop = RegExp('^\\s*'+strMarkerHandle + '(\\d+) '),
            arrM = regexTop.exec(objInst.strHTML);
            if(arrM){this.arrPointers = [arrM[1]];}
            return this;
        }
        ,changeEachPointer:function(objInst,strMarkerHandle,strRegBefore,strRegAfter){
            var strHTML = objInst.strHTML,
            arrPointers = this.arrPointers,
            arr = [],
            strReg,reg,arrM;
            //return html
            for(var i=0,intLen = arrPointers.length;i < intLen;++i){
                strReg = (strRegBefore + (strMarkerHandle + arrPointers[i] + ' ') + strRegAfter);
                reg = RegExp(strReg);
                arrM = reg.exec(strHTML);
                if(arrM){arr.push(arrM[2]);}
            }
            this.arrPointers = arr;
        }
        ,prev:function(){
            var objInst = this.objInst,
            strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'];
            this.changeEachPointer(objInst,strMarkerHandle,'<(\\/[^>]*|[^\\/][^>]*\\/)>'+strMarkerHandle + '(\\d+) [^<]*','');
            return this;
        }
        ,next:function(){
            var objInst = this.objInst,
            strMarkerHandle = objInst.objMarkers.objM['strMarkerHandle'];
            this.changeEachPointer(objInst,strMarkerHandle,'<(\\/[^>]*|[^\\/][^>]*\\/)>','[^<]*'+strMarkerHandle + '(\\d+) ');
            return this;
        }


        //########################################################
        //binding events
        ,bind:function(strEventType,fnCallback){
//trace(' ');
//trace('ST bind()');
        	//example of user:
        	//ST.top().bind('dblclick',function(evt){});

        	var arrPointers = this.arrPointers;

        	for(var i=0, intLen = arrPointers.length; i < intLen;++i){
        		var strPointer = arrPointers[i];

        		//get the original selector for this pointer.
        		var strSelector = this.getSelector(strPointer);


//trace('original pointer='+strPointer);
//trace('original selector='+strSelector);

        		var objData = STQuery().shared.data;

        		//store the bind event into STQuery data object
        		if(!objData.hasOwnProperty(strSelector)){
        			objData[strSelector] = {};
        		};

        		if(!objData[strSelector].hasOwnProperty(strEventType)){
        			objData[strSelector][strEventType] = {};
        			objData[strSelector][strEventType].arr = [];
        		}

        		//populate the select eventype data array with each callback function
        		objData[strSelector][strEventType].arr.push(fnCallback);

        		//add an onEvent attribute to the specific selector to call the STQuery data function.
        		//reset arrPointers explicitly to each single pointer
        		this.arrPointers = [strPointer];
        		this.attr('on'+strEventType,"STQuery().dataArrayTrigger('"+strSelector+"','"+strEventType+"')");
        	}

        	//return arrPointers back to normal
        	this.arrPointers = arrPointers;

        	return this;
        }
        ,selectors:{
        	//example
        	//2:'#asdf'
        }
        ,getSelector:function(i){
        	return this.selectors[i];
        }
        ,first:function(){
        	var arrPointers = this.arrPointers;
        	arrPointers = arrPointers.reverse();
            this.arrPointers = [arrPointers.shift()];
            return this;
        }
        ,last:function(){
        	var arrPointers = this.arrPointers;
        	arrPointers = arrPointers.reverse();
            this.arrPointers = [arrPointers.pop()];
            return this;
        } 
    };
    //###########################################################################################################
    window.STQuery = STQuery;
}(window));

/*
 //http://ejohn.org/apps/workshop/adv-talk/#9

 JQUERY METHOD

 $("<li><a></a></li>") // li
  .find("a") // a
    .attr("href", "http://ejohn.org/") // a
    .html("John Resig") // a
  .end() // li
  .appendTo("ul");

//using fragments
	var div = document.createElement("div");
	div.innerHTML = "<li><a></a></li>";
	var fragment = document.createDocumentFragment();
	while ( div.firstChild ) {
  	fragment.appendChild( div.firstChild );
	}

//getting all the events data
/$('selector').data('events);

 */

